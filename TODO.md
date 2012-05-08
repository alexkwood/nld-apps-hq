
## General
- make error handlers work
- dynamic helpers are shared, duplicates loading; switch to middleware or other approach?
- every dynamic helper runs on every single request, so make sure any that do DB ops only run when needed
- figure out how to share modules between apps. want to require.paths.push(), but deprecated? (using symlinks for now)
- wait 1/2 second between use(app)'s to avoid mongodb error/race condition? (otherwise need to async mount apps)
- switch console.log to https://github.com/flatiron/winston
- apply canUser() check to each app

## Flashcards
- allow res.redirect(/logout) to go to parent logout

## Lists
- graceful degradation to non-socket posts? (low priority)
- more string escaping to prevent injections? ... (socket.io seems to escape well enough for now)
- can take out 'if (parentApp)' conditions, can now assume parentApp exists
- put in a catch-all POST handler w/ an error saying posts shouldn't work, socket must be broken!
