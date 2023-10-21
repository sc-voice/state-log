# @sc-voice/state-log

Javascript client and server library for monitoring remote server state. 
Compatible with any HTTP server that provide status information 
in JSON format.

### Compact logging
Information is logged compactly and grows incrementally only
if the state actually changes--
if a monitored state doesn't change for years, the log won't grow.
Full state log can be sent over HTTP to support arbitrary client views.

### State normalization
Key fields can be chosedn from raw JSON to create a normalized state for logging.
Normalization can also be applied to JSON property value strings
using regular expressions that match the value substring to retain.

### Client and Server
The Javacript library can be used in NodeJS as well as in a browser.


### Serialization
Logs are serializable as JSON files.

See [API](https://sc-voice.github.io/state-log)

