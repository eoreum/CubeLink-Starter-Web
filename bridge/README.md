# CubeLink Starter Bridge

The public Starter site cannot run a native compiler or uploader inside the browser sandbox. This localhost-only companion invokes the official Arduino CLI without a shell and accepts requests only from the CubeLink Starter GitHub Pages origin or localhost development pages.

Windows setup:

1. Run `setup-bridge.cmd` once. It downloads checksum-verified official portable Node.js LTS and Arduino CLI packages, then installs `arduino:avr`, `DHT sensor library`, and `Adafruit Unified Sensor`.
2. Run `start-bridge.cmd` before using the site's hardware dialog. Keep the window open.
3. Connect an Uno R3, Nano Classic, or Mega 2560 and choose the correct COM port.

Live mode first probes the selected serial port for `CL:LIVE:<version>`. If the
board already reports the current CubeLink Starter Live version, no firmware is
written. If the response is missing or the version differs, the bridge compiles
and uploads the bundled teaching firmware, verifies the same handshake again,
and only then reports the board ready. Returning from Upload mode to Live mode
can therefore restore the Live firmware automatically without asking the
student to locate or install a firmware file.

The server listens only on `127.0.0.1:32145`. Board profiles and serial-port formats are allowlisted, source size is limited, compiler arguments are passed without a command shell, one job runs at a time, and temporary sketches are deleted after each job. The bundled Live firmware accepts a small line protocol for pin mode, digital/PWM output, and digital/analog input at 9600 baud.

This bridge is for CubeLink Starter's general Arduino lessons. It is not the authenticated CubeLink production-hardware connection path described in the main CubeLink product security plan.
