This repo contains all of the changes that I would have made for the server file that chatGPT generated.
For my reasoning behind the changes, please see the fork of the example file:
https://gist.github.com/dillonbartkus/e54d34b56c3be1d5becaf6ff8eb3ede3#file-ex2-ts-L259
Note: I did not have time to implement most of the changes I suggested, as my 2 hours was up!
Only the file structure and some minor syntax changes were the only changes I was able to make.

### Set up the DB:

`node-ts ./db/model.ts`
`node-ts ./db/seed.ts`

### Run server:

`node-ts app.ts`