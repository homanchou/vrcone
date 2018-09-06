/* global io */

$(function () {

  // makes connection
  var socket = io();
  var avatar = {
    joined: false,
    id: undefined,
    color: undefined
  };

  socket.on('connection-success', function (id, color) {
    avatar.id = id;
    avatar.color = color;
    console.log('connected', avatar);
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
    avatar.joined = true;
    // gets hash of all players, draw them all
    $.each(data, function (key, value) {
      if (key == avatar.id) {
        return
      }
      updatePlayer(key, value);
    });
  });

  function removePlayer(id) {
    if (document.getElementById(id) === null) {
      return
    } else {
      var el = document.getElementById(id);
      el.parentNode.removeChild(el);
    }
  }

  function updatePlayer(id, data) {
    if (document.getElementById(id) === null) {
      var el = document.createElement('a-entity');
      el.setAttribute('id', id);
      document.querySelector('a-scene').appendChild(el);
      el.setAttribute('geometry', {
        primitive: 'box'
      });
      el.setAttribute('material', {
        color: data.color
      });
      setPosition(el, data);
      setRotation(el, data);
    } else {
      var el = document.getElementById(id);
      setPosition(el, data);
      setRotation(el, data);
    }
  }

  function setPosition(el, data) {
    if (data.position != undefined) {
      el.object3D.position.set(data.position.x, data.position.y, data.position.z);
    }
  }

  function setRotation(el, data) {
    if (data.rotation != undefined) {
      el.object3D.rotation.set(
        THREE.Math.degToRad(data.rotation.x),
        THREE.Math.degToRad(data.rotation.y),
        THREE.Math.degToRad(data.rotation.z)
      );
    }
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

  var prevX = 0;
  var prevY = 0;
  var prevZ = 0;

  window.AFRAME.registerComponent('rotation-reader', {
    tick: function () {

      if (!avatar.joined) {
        return
      }

      if (Math.floor(Math.random() * 15) != 1) {
        return
      }

      var rotation = this.el.getAttribute('rotation');
      // do nothing if barely rotating
      if (Math.abs(prevX - rotation.x) < 3 && Math.abs(prevY - rotation.y) < 3 && Math.abs(prevZ - rotation.z) < 3) {
        return
      }
      var data = {
        rotation: rotation
      }
      console.log(avatar.id, "rotating", data);
      socket.emit('headset-rotating', data);
      prevX = rotation.x;
      prevY = rotation.y;
      prevZ = rotation.z;

    }
  });



  window.AFRAME.registerComponent('init-avatar', {

    init: function () {
      var y = Math.floor(Math.random() * 360);
      var x = Math.random() * 10 - 5;
      var z = Math.random() * 10 - 5;

      var rotation = this.el.getAttribute('rotation');
      rotation.y += y;
      this.el.setAttribute('rotation', rotation)
      var position = this.el.getAttribute('position');
      position.x += x;
      position.z += z;
      position.y += 1.6;
      this.el.setAttribute('position', position)
      // avatarID = Math.random().toString(32).substr(2,9);
      var data = {
        rotation: rotation,
        position: position
      };
      socket.emit('player-joining', data);
    }
  });

});