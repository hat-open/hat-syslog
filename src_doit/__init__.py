from pathlib import Path
import subprocess
import sys
import tempfile

from hat import json
from hat.doit import common
from hat.doit.py import (build_wheel,
                         run_pytest,
                         run_flake8)
from hat.doit.docs import (SphinxOutputType,
                           build_sphinx,
                           build_pdoc)


__all__ = ['task_clean_all',
           'task_build',
           'task_check',
           'task_test',
           'task_docs',
           'task_ui',
           'task_deps',
           'task_json_schema_repo']


build_dir = Path('build')
src_py_dir = Path('src_py')
src_js_dir = Path('src_js')
src_static_dir = Path('src_static')
pytest_dir = Path('test_pytest')
docs_dir = Path('docs')
schemas_json_dir = Path('schemas_json')
node_modules_dir = Path('node_modules')

build_py_dir = build_dir / 'py'
build_docs_dir = build_dir / 'docs'

ui_dir = src_py_dir / 'hat/syslog/server/ui'
json_schema_repo_path = src_py_dir / 'hat/syslog/json_schema_repo.json'


def task_clean_all():
    """Clean all"""
    return {'actions': [(common.rm_rf, [build_dir,
                                        ui_dir,
                                        json_schema_repo_path])]}


def task_build():
    """Build"""

    def build():
        build_wheel(
            src_dir=src_py_dir,
            dst_dir=build_py_dir,
            src_paths=list(common.path_rglob(src_py_dir,
                                             blacklist={'__pycache__'})),
            name='hat-syslog',
            description='Hat Syslog',
            url='https://github.com/hat-open/hat-syslog',
            license=common.License.APACHE2,
            packages=['hat'],
            console_scripts=['hat-syslog = hat.syslog.server.main:main'])

    return {'actions': [build],
            'task_dep': ['ui',
                         'json_schema_repo']}


def task_check():
    """Check with flake8"""
    return {'actions': [(run_flake8, [src_py_dir]),
                        (run_flake8, [pytest_dir])]}


def task_test():
    """Test"""
    return {'actions': [lambda args: run_pytest(pytest_dir, *(args or []))],
            'pos_arg': 'args',
            'task_dep': ['json_schema_repo']}


def task_docs():
    """Docs"""
    return {'actions': [(build_sphinx, [SphinxOutputType.HTML,
                                        docs_dir,
                                        build_docs_dir]),
                        (build_pdoc, ['hat.syslog',
                                      build_docs_dir / 'py_api'])],
            'task_dep': ['ui',
                         'json_schema_repo']}


def task_deps():
    """Install dependencies"""
    return {'actions': ['yarn install --silent']}


def task_ui():
    """Build UI"""

    def build(args):
        args = args or []
        common.rm_rf(ui_dir)
        common.cp_r(src_static_dir, ui_dir)
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            config_path = tmpdir / 'webpack.config.js'
            config_path.write_text(_webpack_conf.format(
                src_path=(src_js_dir / 'main.js').resolve(),
                dst_dir=ui_dir.resolve()))
            subprocess.run([str(node_modules_dir / '.bin/webpack'),
                            '--config', str(config_path),
                            *args],
                           check=True)

    return {'actions': [build],
            'pos_arg': 'args',
            'task_dep': ['deps']}


def task_json_schema_repo():
    """Generate JSON Schema Repository"""
    src_paths = list(schemas_json_dir.rglob('*.yaml'))

    def generate():
        repo = json.SchemaRepository(*src_paths)
        data = repo.to_json()
        json.encode_file(data, json_schema_repo_path, indent=None)

    return {'actions': [generate],
            'file_dep': src_paths,
            'targets': [json_schema_repo_path]}


_webpack_conf = r"""
module.exports = {{
    mode: 'none',
    entry: '{src_path}',
    output: {{
        filename: 'main.js',
        path: '{dst_dir}'
    }},
    module: {{
        rules: [
            {{
                test: /\.scss$/,
                use: [
                    "style-loader",
                    {{
                        "loader": "css-loader",
                        options: {{url: false}}
                    }},
                    {{
                        loader: "sass-loader",
                        options: {{sourceMap: true}}
                    }}
                ]
            }}
        ]
    }},
    watchOptions: {{
        ignored: /node_modules/
    }},
    devtool: 'source-map',
    stats: 'errors-only'
}};
"""
