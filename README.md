# VR Multiplayer Game

## Connecting Client to Server

1. client connects to websocket server when socket is defined
1. server handles an implicit on 'connection' callback, no avatar payload is sent to server, waits for msgs
1. aframe component initializes avatar random location and on initial client load, send a player_joining msg to server with avatar position and rotation to server
1. server receives msg and set flag that player has joined while broadcast emit player_joined initial location and position to other players.
1. other clients receive player_joined msg and draw an object at that location

## Updates

1. aframe component reads headset movement and sends from client to server msg headset_moving
1. server recieves headset_moving msg and broadcasts to other players
1. other clients receive headset_moved and update the vr models with an animation

## Misc

- added reload function to update changes on all headset thru a broadcast msg