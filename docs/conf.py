from pathlib import Path


root_path = Path(__file__).parent.parent.resolve()

extensions = [
    'sphinx.ext.todo',
    'sphinxcontrib.plantuml',
    'sphinxcontrib.programoutput',
]

version = (root_path / 'VERSION').read_text().strip()
project = 'hat-syslog'
copyright = '2020-2022, Hat Open AUTHORS'
master_doc = 'index'

html_theme = 'furo'
html_static_path = ['static']
html_css_files = ['custom.css']
html_use_index = False
html_show_sourcelink = False
html_show_sphinx = False
html_sidebars = {'**': ["sidebar/brand.html",
                        "sidebar/scroll-start.html",
                        "sidebar/navigation.html",
                        "sidebar/scroll-end.html"]}

todo_include_todos = True
