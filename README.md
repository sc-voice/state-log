# @sc-voice/state-log

Javascript client and server library for differntial logging.
Usefulfor  monitoring remote server state that changes infrequently. 
Compatible with any HTTP server that provide status information 
in JSON format.

### Compact logging
Information is logged compactly and grows incrementally only
if the state actually changes--
if a monitored state doesn't change for years, the log won't grow.
Full state log can be sent over HTTP to support arbitrary client views.

### State normalization
Select fields can be chosen from raw JSON to create a normalized state for logging.
Normalization can also be applied to JSON property value strings
using regular expressions that match the value substring to retain.
Normalization is required to remove any timestamps embedded 
in the state to be logged. Timestamps defeat the purpose of
differential logging.

### Client and Server
The Javacript library can be used in NodeJS as well as in a browser.

### Serialization
Logs are serializable as JSON files.

See [API](https://sc-voice.github.io/state-log)


## Command line utilities

### test-util
Monitor given URL periodically, sending any new state to stdout.
Default URL is 

* http://worldtimeapi.org/api/timezone/America/Los_Angeles

Users can specify a JSON filter that chooses desired
properties or matches key portions of timestamps.
Here, we extract the HH:MM:S part of a given timestamp
using StateLog normalization:

```
scripts/test-url --json-filter '{datetime:"T[^:]+:[^:]+:."}'

```

