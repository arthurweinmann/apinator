#!/bin/bash

mkdir -p ~/.ssh

echo "$DEPLOY_SSH_KEY" > ~/.ssh/id_rsa

chmod 600 ~/.ssh/id_rsa

tmp=$(pwd)
make build
cd $tmp

ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa root@78.47.67.22 "/bin/bash -c 'systemctl stop apinator.service'"

rsync -av --delete -e "ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa" --exclude 'projects' --exclude 'storage' ./build root@78.47.67.22:/apinator

ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa root@78.47.67.22 "/bin/bash -c 'python3 -m pip install --force-reinstall /apinator/build/gpt_engineer-0.0.7-py3-none-any.whl'"

ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ~/.ssh/id_rsa root@78.47.67.22 "/bin/bash -c 'systemctl start apinator.service'"