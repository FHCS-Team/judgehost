### Important prerequisites

1. Mock CDN for downloading problem & submission packages is at ./mock/cdn/, which runs on localhost:3001
2. When creating a new problem/submission, make sure to add the problem/submission package to the mock CDN folder ./mock/cdn/fs/ (containing artifacts/, problems/, submissions/)
3. Packages are zip files, named as {problemId}.zip or {submissionId}.zip (and .tar.gz is also supported)
4. The judgehost server is at localhost:3000
