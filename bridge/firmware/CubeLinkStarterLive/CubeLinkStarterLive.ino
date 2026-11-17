#include <Arduino.h>
#include <DHT.h>
const char LIVE_VERSION[] = "1.1.0";
char buffer[80]; byte used=0; bool overflow=false;
byte modes[NUM_DIGITAL_PINS];
DHT* sensors[NUM_DIGITAL_PINS]={0};
unsigned long lastCommand=0;
bool validPin(int p){return p>=2 && p<NUM_DIGITAL_PINS;}
void resetPins(){for(int p=2;p<NUM_DIGITAL_PINS;p++){digitalWrite(p,LOW);pinMode(p,INPUT);modes[p]=INPUT;}}
void error(const char* text){Serial.print("CL:ERR:");Serial.println(text);}
void value(int p,float v){if(isnan(v)){error("SENSOR");return;}Serial.print("CL:VAL:");Serial.print(p);Serial.print(':');Serial.println(v,4);}
bool integer(const char* text,int &result){if(!text||!*text)return false;char* end;long n=strtol(text,&end,10);if(*end||n<0||n>255)return false;result=(int)n;return true;}
void execute(){
 lastCommand=millis();
 if(!strcmp(buffer,"CL:HELLO")){Serial.print("CL:LIVE:");Serial.println(LIVE_VERSION);return;}
 if(!strcmp(buffer,"CL:RESET")){resetPins();Serial.println("CL:OK");return;}
 char* op=strtok(buffer,",");char* a=strtok(NULL,",");char* b=strtok(NULL,",");int p,v;
 if(!op||!integer(a,p)){error("PIN");return;}
 // Nano A6/A7 are ADC-only and lie above NUM_DIGITAL_PINS.
 if(!strcmp(op,"AR")&&p>=A0&&p<A0+NUM_ANALOG_INPUTS){value(p,analogRead(p));return;}
 if(!validPin(p)){error("PIN");return;}
 if(!strcmp(op,"PM")&&b){
  byte m;if(!strcmp(b,"OUT"))m=OUTPUT;else if(!strcmp(b,"IN"))m=INPUT;else if(!strcmp(b,"PULLUP"))m=INPUT_PULLUP;else{error("MODE");return;}
  pinMode(p,m);modes[p]=m;Serial.println("CL:OK");
 }else if(!strcmp(op,"DW")&&integer(b,v)&&v<=1&&modes[p]==OUTPUT){digitalWrite(p,v?HIGH:LOW);Serial.println("CL:OK");
 }else if(!strcmp(op,"DR")){value(p,digitalRead(p));
 }else if(!strcmp(op,"AR")&&p>=A0&&p<A0+NUM_ANALOG_INPUTS){value(p,analogRead(p));
 }else if(!strcmp(op,"US")&&integer(b,v)&&validPin(v)&&v!=p){
  pinMode(p,OUTPUT);modes[p]=OUTPUT;pinMode(v,INPUT);modes[v]=INPUT;
  digitalWrite(p,LOW);delayMicroseconds(2);digitalWrite(p,HIGH);delayMicroseconds(10);digitalWrite(p,LOW);
  unsigned long duration=pulseIn(v,HIGH,30000UL);value(p,duration?duration*.0343f/2:-1);
 }else if(!strcmp(op,"DT")||!strcmp(op,"DH")){
  if(!sensors[p]){sensors[p]=new DHT(p,DHT11);sensors[p]->begin();}
  value(p,!strcmp(op,"DT")?sensors[p]->readTemperature():sensors[p]->readHumidity());
 }else error("COMMAND_OR_MODE");
}
void setup(){Serial.begin(9600);resetPins();}
void loop(){
 while(Serial.available()){
  char c=Serial.read();if(c=='\r')continue;
  if(c=='\n'){if(!overflow){buffer[used]=0;if(used)execute();}else error("TOO_LONG");used=0;overflow=false;}
  else if(used<sizeof(buffer)-1)buffer[used++]=c;else overflow=true;
 }
 // Release outputs if the browser disappears. A block delay can last 60 seconds.
 if(millis()-lastCommand>65000UL){resetPins();lastCommand=millis();}
}
