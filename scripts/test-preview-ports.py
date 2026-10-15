import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("ports", pathlib.Path(__file__).with_name("check-preview-ports.py"))
ports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ports)


def config(port=5000, target=5000):
    return {"workflows": {"workflow": [{"name": "Start application", "tasks": [{"waitForPort": port}]}]},
            "ports": [{"localPort": target, "externalPort": 80}],
            "deployment": {"run": ["npm", "run", "start"]}}


class PortChecks(unittest.TestCase):
    source = 'const port = parseInt(process.env.PORT || "5000", 10);'

    def test_current(self):
        self.assertEqual(ports.check(config(), self.source), [])

    def test_wrong_public_target(self):
        self.assertTrue(ports.check(config(target=8081), self.source))

    def test_wrong_workflow(self):
        self.assertTrue(ports.check(config(port=8081), self.source))

    def test_environment_override(self):
        self.assertEqual(ports.check(config(9000, 9000), self.source, 9000), [])

    def test_ambiguous_routes(self):
        data = config()
        data["ports"].append({"localPort": 8081, "externalPort": 80})
        self.assertTrue(ports.check(data, self.source))

    def test_unknown_source_fails_explicitly(self):
        self.assertTrue(ports.check(config(), "unrecognized port logic"))


if __name__ == "__main__":
    unittest.main()
