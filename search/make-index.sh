#!/bin/bash

cd $(dirname $0)

if [ "$#" -ne 1 ]; then
  echo "make-index.sh [wiki root]"
  echo ""
  echo "[wiki root] must be a directory with 'wiki' subdirectory containing"
  echo "the articles"
fi

if [ ! -d "wiki-search" ]; then
  git clone https://github.com/magik6k/distributed-wiki-search.git wiki-search
fi

echo "Generate article list"
ls $1/wiki > wiki-search/articles
cd wiki-search
./index.sh
cd ..
echo "^ You might want to pin the index root ^"
