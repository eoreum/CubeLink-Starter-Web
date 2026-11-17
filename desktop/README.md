# CubeLink Starter Windows Desktop 1.8.0

Windows x64 installer integrating the existing classroom frontend, Electron,
Arduino CLI, AVR board core/toolchain, DHT libraries and Live firmware.
No Node.js, Arduino IDE or Bridge installation is required on the target machine.
No background startup service is registered: the native tools live only while
the application is running. User projects are stored in the application's
profile, independently of the browser version. JSON import/export transfers
projects between editions.

First launch copies bundled Arduino tools into the user's app data folder;
subsequent launches reuse them. This needs additional disk space but no network.
Some USB boards require their manufacturer's USB serial driver if Windows does
not already have it. Physical board upload and sensors require device QA.

Security: sandboxed renderer, context isolation, no renderer Node access,
fixed IPC routes restricted to cubelink://app, no arbitrary shell commands,
allowlisted board profiles and ports, internal random-port service with a token
on every request, navigation locked to local application content, and no
remote code loading. The token is kept in the main process.

Build: npm ci, node prepare-ui.cjs (only after recopying original UI),
node --test tests.test.cjs, npm run dist.
The payload is prepared from official Arduino packages. See LICENSES and the
licenses inside the payload and Electron distribution. The installer is not
code-signed; it is a test release and Windows may display an unknown-publisher
warning. No automatic updater is configured.

Sources: original classroom source https://github.com/eoreum/CubeLink-Starter-Web
Arduino CLI https://github.com/arduino/arduino-cli (GPL-3.0)
Arduino AVR core https://github.com/arduino/ArduinoCore-avr (LGPL-2.1)
DHT https://github.com/adafruit/DHT-sensor-library (MIT)
Adafruit Unified Sensor https://github.com/adafruit/Adafruit_Sensor (Apache-2.0)
Electron https://github.com/electron/electron (MIT and bundled notices)
Blockly https://github.com/google/blockly (Apache-2.0)
