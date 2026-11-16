// CubeLink Starter Live firmware 1.0.0
// General Arduino teaching firmware for Uno, Nano, and Mega.

const char LIVE_VERSION[] = "1.0.0";
char commandBuffer[80];
byte commandLength = 0;

bool validPin(int pin) {
  return pin >= 0 && pin < NUM_DIGITAL_PINS;
}

void replyVersion() {
  Serial.print("CL:LIVE:");
  Serial.println(LIVE_VERSION);
}

void replyError(const char* message) {
  Serial.print("CL:ERR:");
  Serial.println(message);
}

void handleCommand(char* command) {
  if (strcmp(command, "CL:HELLO") == 0) {
    replyVersion();
    return;
  }

  char* operation = strtok(command, ",");
  char* pinText = strtok(NULL, ",");
  char* valueText = strtok(NULL, ",");
  if (!operation || !pinText) {
    replyError("FORMAT");
    return;
  }

  int pin = atoi(pinText);
  if (!validPin(pin)) {
    replyError("PIN");
    return;
  }

  if (strcmp(operation, "PM") == 0 && valueText) {
    if (strcmp(valueText, "OUT") == 0) pinMode(pin, OUTPUT);
    else if (strcmp(valueText, "PULLUP") == 0) pinMode(pin, INPUT_PULLUP);
    else if (strcmp(valueText, "IN") == 0) pinMode(pin, INPUT);
    else { replyError("MODE"); return; }
    Serial.println("CL:OK");
  } else if (strcmp(operation, "DW") == 0 && valueText) {
    digitalWrite(pin, atoi(valueText) ? HIGH : LOW);
    Serial.println("CL:OK");
  } else if (strcmp(operation, "PW") == 0 && valueText) {
    analogWrite(pin, constrain(atoi(valueText), 0, 255));
    Serial.println("CL:OK");
  } else if (strcmp(operation, "DR") == 0) {
    Serial.print("CL:VAL:");
    Serial.print(pin);
    Serial.print(':');
    Serial.println(digitalRead(pin));
  } else if (strcmp(operation, "AR") == 0) {
    Serial.print("CL:VAL:");
    Serial.print(pin);
    Serial.print(':');
    Serial.println(analogRead(pin));
  } else {
    replyError("COMMAND");
  }
}

void setup() {
  Serial.begin(9600);
  replyVersion();
}

void loop() {
  while (Serial.available()) {
    char incoming = Serial.read();
    if (incoming == '\r') continue;
    if (incoming == '\n') {
      commandBuffer[commandLength] = '\0';
      if (commandLength) handleCommand(commandBuffer);
      commandLength = 0;
    } else if (commandLength < sizeof(commandBuffer) - 1) {
      commandBuffer[commandLength++] = incoming;
    } else {
      commandLength = 0;
      replyError("TOO_LONG");
    }
  }
}
