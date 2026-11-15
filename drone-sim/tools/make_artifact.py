"""Turn index.html into a body-only page for claude.ai Artifact hosting (the host adds the skeleton)."""
import re, sys
src = open(sys.argv[1]).read()
title = re.search(r'<title>.*?</title>', src, re.S).group(0)
style = re.search(r'<style>.*?</style>', src, re.S).group(0)
body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
open(sys.argv[2], 'w').write(f'{title}\n{style}\n{body}')
