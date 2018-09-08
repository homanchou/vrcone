/* global io */

$(function () {

  // makes connection
  var socket = io();
  var ship = {
    joined: false
  };
  var playerData = {}

  socket.on('connection-success', function (id) {
    ship.id = id;
    document.getElementById('ship').setAttribute('init-ship', {});
  });

  // Whenever the server emits 'consolelog', update the console.log
  socket.on('consolelog', function (data) {
    console.log("server says:", data);
  });

  socket.on('reload-broadcasted', function () {
    console.log("received reload broadcast:");
    location.reload(true);
  });

  socket.on('player-left', function (id) {
    console.log("received player left:", id);
    removePlayer(id);
  });

  socket.on('headset-rotated', function (id, data) {
    console.log("received player rotated broadcast:", id, data);
    updatePlayer(id, data);
  });

  socket.on('join-successful', function (data) {
    console.log('join success', data);
    ship.joined = true;
    // gets hash of all players, draw them all
    $.each(data, function (key, value) {
      if (key == ship.id) {
        return
      }
      updatePlayer(key, value);
    });
    document.getElementById('head').setAttribute('head-rotation-reader', {});
  });

  function removePlayer(id) {
    if (document.getElementById(id) === null) {
      return;
    } else {
      var el = document.getElementById(id);
      el.parentNode.removeChild(el);
    }
  }

  function updatePlayer(id, data) {
    if (document.getElementById(id) === null) {
      // el holds player rotation and position
      var el = document.createElement('a-entity');
      el.setAttribute('id', id);
      document.querySelector('a-scene').appendChild(el);
      // nest a ship so we see players ship
      var ship = document.createElement('a-entity');
      ship.setAttribute('id', 'ship-' + id);
      el.appendChild(ship);
      ship.setAttribute('geometry', {
        primitive: 'cone',
        radiusBottom: 1.5,
        height: 3,
        radiusTop: 0,
        openEnded: false
      });
      // squash cone into a ship
      shipScale = ship.getAttribute('scale');
      shipScale.z = 0.1;
      ship.setAttribute('scale', shipScale);
      shipRotation = ship.getAttribute('rotation');
      shipRotation.x -= 90;
      ship.setAttribute('rotation', shipRotation);
      ship.setAttribute('material', {
        color: data.shipColor
      });
      // nest a person on the ship so we can move head relative to ship
      // playerCam will be positioned by socket updates
      var playerCam = document.createElement('a-entity');
      playerCam.setAttribute('id', 'player-cam-' + id);
      el.appendChild(playerCam);
      // head will show the orientation of the camera
      var head = document.createElement('a-entity');
      playerCam.appendChild(head);
      head.setAttribute('geometry', {
        primitive: 'cone',
        radiusBottom: 0.8,
        height: 1,
        radiusTop: 0
      });
      headRotation = head.getAttribute('rotation');
      headRotation.x -= 90;
      head.setAttribute('rotation', headRotation);
      head.setAttribute('material', {
        color: data.shipColor
      });
      headPosition = head.getAttribute('position');
      headPosition.y += 1;
      headPosition.z -= 0.2;
      head.setAttribute('position', headPosition);

      setPosition(el, data.shipPosition);
      setRotation(el, data.shipRotation);
      setRotation(playerCam, data.headRotation);
    } else {
      var el = document.getElementById(id);
      var playerCam = document.getElementById('player-cam-' + id)
      setPosition(el, data.shipPosition);
      setRotation(el, data.shipRotation);
      setRotation(playerCam, data.headRotation);
    }
  }

  function setPosition(el, position) {
    if (position != undefined) {
      el.object3D.position.set(position.x, position.y, position.z);
    }
  }

  function setRotation(el, rotation) {
    console.log('el', el)
    if (rotation === undefined) {
      return;
    }
    if (playerData['rot' + el.id] != undefined) {
      playerData['rot' + el.id].pause();
    }

    var test = {
      x: window.THREE.Math.radToDeg(el.object3D.rotation.x),
      y: window.THREE.Math.radToDeg(el.object3D.rotation.y),
      z: window.THREE.Math.radToDeg(el.object3D.rotation.z)
    };

    playerData['rot' + el.id] = window.anime({
      targets: test,
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
      delay: 0,
      duration: 300,
      elasticity: 0,
      begin: function () {
        // el.setAttribute("animating", "true");
        console.log("starting with test:", test);
        console.log('starting object3d rotation', el.object3D.rotation.x)
      },
      update: function (anim) {
        // console.log('easing', test)
        el.object3D.rotation.set(window.THREE.Math.degToRad(test.x), window.THREE.Math.degToRad(test.y), window.THREE.Math.degToRad(test.z));
      },
      complete: function () {
        // el.setAttribute("animating", "false");
        console.log('completed test', test)
        console.log('completed object3d rotation', el.object3D.rotation.x)
      },
    });

  }

  socket.on('player-joined', function (id, data) {
    console.log('player joined', id, data);
    updatePlayer(id, data);
  });


  //public
  window.reload = function () {
    socket.emit('reload');
    console.log('requesting reload');
  }

  // get into vr mode
  $(document.body).on("touchend", function () {
    document.querySelector('a-scene').enterVR();
  });

  //aframe component

  window.AFRAME.registerComponent('head-rotation-reader', {
    init: function () {
      this.prevX = 0;
      this.prevY = 0;
      this.prevZ = 0;
    },
    tick: function () {

      var rotation = this.el.getAttribute('rotation');
      // do nothing if barely rotating
      if (Math.abs(this.prevX - rotation.x) < 3 && Math.abs(this.prevY - rotation.y) < 3 && Math.abs(this.prevZ - rotation.z) < 3) {
        return
      }
      var data = {
        headRotation: rotation
      }
      console.log(ship.id, "rotating", data);
      socket.emit('headset-rotating', data);
      this.prevX = rotation.x;
      this.prevY = rotation.y;
      this.prevZ = rotation.z;

    }
  });



  window.AFRAME.registerComponent('init-ship', {

    init: function () {
      var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
      // var rotation = {
      //   x: 0,
      //   y: Math.floor(Math.random() * 360),
      //   z: 0
      // };
      // var position = {
      //   x: (Math.random() * 10 - 5),
      //   y: 1.6,
      //   z: (Math.random() * 10 - 5)
      // };
      // this.el.object3D.rotation.set(0, window.THREE.degToRad(rotation.y), 0);
      // this.el.object3D.position.set(position.x, position.y, position.z);
      var rotation = this.el.getAttribute('rotation');
      rotation.y += Math.floor(Math.random() * 360);
      this.el.setAttribute('rotation', rotation)
      var position = this.el.getAttribute('position');
      position.x += (Math.random() * 10 - 5);
      position.z += (Math.random() * 10 - 5);
      position.y += 0; //1.6;
      this.el.setAttribute('position', position)
      var data = {
        shipColor: color,
        shipRotation: rotation,
        shipPosition: position,
        headRotation: {
          x: 0,
          y: 0,
          z: 0
        }
      };
      console.log('in init sending', data);
      socket.emit('player-joining', data);
    }
  });

});