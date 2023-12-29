: ${RUN_PATH:?} ${ROOT_PATH:?}

PYTHON=${PYTHON:-python3}
DATA_PATH=$RUN_PATH/data
VERSION=$($PYTHON -m hat.json.convert $ROOT_PATH/pyproject.toml | \
          jq -r .project.version)

export PYTHONPATH=$ROOT_PATH/src_py

mkdir -p $DATA_PATH
