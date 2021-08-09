import subprocess
import sys
import signal
import time

import psutil

from hat import util


class Process:

    def __init__(self, cmd, stdout=None, stderr=None):
        creationflags = (subprocess.CREATE_NEW_PROCESS_GROUP
                         if sys.platform == 'win32' else 0)
        self._p = psutil.Popen(cmd, creationflags=creationflags,
                               stdout=stdout, stderr=stderr)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def close(self, wait_timeout=5):
        # TODO what to do with zombie process?
        if not self._p.is_running():
            return
        self._p.send_signal(signal.CTRL_BREAK_EVENT if sys.platform == 'win32'
                            else signal.SIGTERM)
        try:
            self._p.wait(wait_timeout)
        except psutil.TimeoutExpired:
            self._p.kill()

    def has_connection(self, local_port):
        return bool(util.first(self._p.connections(),
                               lambda i: i.laddr.port == local_port))

    def wait_connection(self, local_port, timeout):
        start = time.monotonic()
        while time.monotonic() - start < timeout:
            if self.has_connection(local_port):
                return
            time.sleep(0.01)
        raise TimeoutError()
