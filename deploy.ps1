npm run build
cd dist
git init
git add -A
git commit -m 'deploy'
git push -f https://github.com/fabian-beck/pure-suggest.git main:gh-pages
cd ..