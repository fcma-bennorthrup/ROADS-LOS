"""Resume only unfinished captures after a fixture readiness timeout."""
from pathlib import Path
import os
import subprocess
import sys

work = Path(sys.argv[1]).resolve()
assert str(work).startswith("/tmp/loan-query-")
copy = work / "copy"
capture = copy / "verification/loan-query/capture.mjs"
text = capture.read_text()
text = text.replace(
    '        assert.equal(await evaluate(\'document.body.dataset.ready\'), "true");',
    '''        for (let attempt = 0; attempt < 50; attempt++) {
          if (await evaluate('document.body.dataset.ready') === "true") break;
          await new Promise(r => setTimeout(r, 100));
        }
        assert.equal(await evaluate('document.body.dataset.ready'), "true");''')
capture.write_text(text)
env = {"PATH": os.environ["PATH"], "HOME": str(work / "home"), "TMPDIR": str(work),
       "TZ": "UTC", "LANG": "C.UTF-8",
       "NODE_OPTIONS": "--require=" + str(copy / "verification/baseline/network-guard.cjs")}
with (work / "browser-resumed.log").open("w") as log:
    result = subprocess.run(["node", str(capture), sys.argv[2]], cwd=copy, env=env,
                            stdout=log, stderr=subprocess.STDOUT)
print("Resumed browser exit", result.returncode)
sys.exit(result.returncode)
