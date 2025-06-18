#!/usr/bin/env bash
#
# This script assumes a linux environment

# ***** Update the extension path to your own ***

extension="/Users/admin/Library/Application Support/Adobe/CEP/extensions" 
cwd=$(pwd)

echo "Building..."

npm run dev:cep

cd $extension

mkdir -p wakatime-adobe

cd $cwd

cp -a dist/. "${extension}/wakatime-adobe"

cd $cwd

echo "Done"
