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
      var shipScale = ship.getAttribute('scale');
      shipScale.z = 0.1;
      ship.setAttribute('scale', shipScale);
      var shipRotation = ship.getAttribute('rotation');
      shipRotation.x -= 90;
      ship.setAttribute('rotation', shipRotation);
      ship.setAttribute('shadow', {});

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
        radiusBottom: 0.5,
        height: 1,
        radiusTop: 0
      });
      var headRotation = head.getAttribute('rotation');
      headRotation.x -= 90;
      head.setAttribute('rotation', headRotation);
      head.setAttribute('shadow', {})
      head.setAttribute('material', {
        color: data.shipColor
      });
      var headPosition = head.getAttribute('position');
      headPosition.y += 0.6;
      headPosition.z -= 0.3;
      head.setAttribute('position', headPosition);

      setPosition(el, data.shipPosition, 0, 0);
      setRotation(el, data.shipRotation, 0, 0);
      setRotation(playerCam, data.headRotation, 0, 0);
    } else {
      var el = document.getElementById(id);
      var playerCam = document.getElementById('player-cam-' + id)
      setPosition(el, data.shipPosition, 1500, 10);
      setRotation(el, data.shipRotation, 300, 3);
      setRotation(playerCam, data.headRotation, 300, 0);
    }
  }

  function setPosition(el, position, duration, elasticity) {
    if (position === undefined) {
      return;
    }
    if (playerData['pos' + el.id] != undefined) {
      playerData['pos' + el.id].pause();
    }
    var startPos = el.object3D.position;
    var test = {
      x: startPos.x,
      y: startPos.y,
      z: startPos.z
    };
    playerData['pos' + el.id] = window.anime({
      targets: test,
      x: position.x,
      y: position.y,
      z: position.z,
      delay: 0,
      duration: duration,
      elasticity: elasticity,
      update: function (anim) {
        // console.log('easing', test)
        el.object3D.position.set(test.x, test.y, test.z);
      }
    });
  }

  function setRotation(el, rotation, duration, elasticity) {
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
      duration: duration,
      elasticity: elasticity,
      update: function (anim) {
        el.object3D.rotation.set(window.THREE.Math.degToRad(test.x), window.THREE.Math.degToRad(test.y), window.THREE.Math.degToRad(test.z));
      }
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
      socket.emit('player-joining', data);
    }
  });

  window.AFRAME.registerComponent('boost-forward', {
    init: function () {
      this.el.addEventListener('click', function (evt) {
        var ship = document.getElementById('ship');
        var startPos = new window.THREE.Vector3(ship.object3D.position.x, ship.object3D.position.y, ship.object3D.position.z);
        var direction = ship.object3D.getWorldDirection(); //new window.THREE.Vector3(ship.object3D.rotation.x, ship.object3D.rotation.y, ship.object3D.rotation.z);
        console.log('direction of the ship', direction)
        var distance = -10;
        var newPos = new THREE.Vector3();
        newPos.addVectors(startPos, direction.multiplyScalar(distance));
        socket.emit('ship-moving', {
          shipPosition: newPos
        });
        setPosition(ship, newPos, 1500, 3);
      });
    }
  });


  window.AFRAME.registerComponent('turn-ship', {
    schema: {
      direction: {
        default: 'left'
      },
      degrees: {
        default: 45
      }
    },
    init: function () {
      var changeBy = (this.data.direction === 'left') ? this.data.degrees : -this.data.degrees;
      this.el.addEventListener('click', function (evt) {
        var ship = document.getElementById('ship');
        var startRot = ship.object3D.rotation;
        var newRot = {
          x: window.THREE.Math.radToDeg(startRot.x),
          y: window.THREE.Math.radToDeg(startRot.y) + changeBy,
          z: window.THREE.Math.radToDeg(startRot.z)
        }

        socket.emit('ship-moving', {
          shipRotation: newRot
        });
        setRotation(ship, newRot, 1500, 3);
      });
    }
  });

});