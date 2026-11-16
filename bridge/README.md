# CubeLink Starter Bridge

The public Starter site cannot run a native compiler or uploader inside the browser sandbox. This localhost-only companion invokes the official Arduino CLI without a shell and accepts requests only from the CubeLink Starter GitHub Pages origin or localhost development pages.

Windows setup:

1. Run `setup-bridge.cmd` once. It downloads checksum-verified official portable Node.js LTS and Arduino CLI packages, then installs `arduino:avr`, `DHT sensor library`, and `Adafruit Unified Sensor`.
2. Run `start-bridge.cmd` before using the site's hardware dialog. Keep the window open.
3. Connect an Uno R3, Nano Classic, or Mega 2560 and choose the correct COM port.

The server listens only on `127.0.0.1:32145`. Board profiles and serial-port formats are allowlisted, source size is limited, compiler arguments are passed without a command shell, one job runs at a time, and temporary sketches are deleted after each job.

This bridge is for CubeLink Starter's general Arduino lessons. It is not the authenticated CubeLink production-hardware connection path described in the main CubeLink product security plan.
