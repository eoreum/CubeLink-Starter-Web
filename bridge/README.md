# CubeLink Starter Bridge

The public Starter site cannot run a native compiler or uploader inside the browser sandbox. This localhost-only companion invokes the official Arduino CLI without a shell and accepts requests only from the CubeLink Starter GitHub Pages origin or localhost development pages.

Windows setup:

1. Run `setup-bridge.cmd` once. It downloads checksum-verified official portable Node.js LTS and Arduino CLI packages, then installs `arduino:avr`, `DHT sensor library`, and `Adafruit Unified Sensor`.
2. Setup copies the bridge to `%LOCALAPPDATA%\CubeLinkStarter\Bridge`, starts it hidden, and creates a current-user Startup shortcut. No administrator rights are needed. It starts again at Windows login. Use `start-bridge.cmd` to restart it manually; logs are in the installed `logs/` folder. `disable-autostart.cmd` removes the Startup shortcut without deleting your files.
3. Connect an Uno R3, Nano Classic, or Mega 2560 and choose the correct COM port.

Live mode first probes the selected serial port for `CL:LIVE:<version>`. If the
board already reports the current CubeLink Starter Live version, no firmware is
written. If the response is missing or the version differs, the bridge compiles
and uploads the bundled teaching firmware, verifies the same handshake again,
and only then reports the board ready. Returning from Upload mode to Live mode
can therefore restore the Live firmware automatically without asking the
student to locate or install a firmware file.

After preparing Live mode, connect the **same board** with the page's USB serial button, close the hardware dialog, and click **실시간 실행**. The browser runs setup once and loop repeatedly using real board sensor responses. Chrome/Edge requires the first serial-device permission from the user. COM numbers are discovered by Arduino CLI; USB-device selection is a separate browser permission and cannot be silently granted. Nano includes old/new bootloader profiles.

The server listens only on `127.0.0.1:32145`. Board profiles and serial-port formats are allowlisted, source size is limited, compiler arguments are passed without a command shell, one job runs at a time, and temporary sketches are deleted after each job. Firmware 1.1.0 supports digital modes/output/input, analog inputs (including Nano A6/A7), TMP36, DHT11 and HC-SR04 at 9600 baud. The browser evaluates variables, comparisons, conditions and map blocks. Live serial print blocks appear in the page's hardware monitor; the transport stays at 9600 even if a serial-begin block specifies another sketch baud. Browser timing and number precision differ from a compiled AVR sketch.

Stopping, editing, or changing missions ends the live run and resets output pins. USB loss or an unresponsive browser releases outputs after at most 65 seconds (the longest supported delay block is 60 seconds). This teaching firmware is not intended for safety-critical actuators. Normal uploaded sketches continue independently when the monitor disconnects; Live mode requires the page and USB connection.

Upgrading: run the new ZIP's `setup-bridge.cmd`. It updates the persistent installation and restarts its own bridge process. Live firmware is updated on the next firmware-check action. Do not keep multiple old bridge folders running.

This bridge is for CubeLink Starter's general Arduino lessons. It is not the authenticated CubeLink production-hardware connection path described in the main CubeLink product security plan.
