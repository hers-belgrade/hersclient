hersclient
==========

This client comes as a replacement for socket.io - that has shown bad performance in terms of memory consumption. (I suspect that socket.io leaks memory)  
Implements a 'long poll' technique to communicate bilaterally - to send and receive requests.
