import sys

from hat.syslog.server.main import main


if __name__ == '__main__':
    sys.argv[0] = 'hat-syslog'
    sys.exit(main())
