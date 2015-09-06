var socket = io();

function connect_socket (token) {
  var socket = io.connect('', {
    query: 'token=' + token
  });

  $('form').submit(function(){
    socket.emit('new message', $('#m').val());
    $('#m').val('');
    return false;
  });

  socket.on('new message', function(data){
    $('#messages').append($('<li>').text(data.message));
    $('#messages').append($('<li>').text(data.username));
  });

  function chatTo(message, destinationUsername){
    socket.emit('chatTo',{ destinationUsername : 'testuser', message : message});
  }

  socket.on('chatterList',function(chatters){
    console.log(chatters);
    $('#chatters').html(''); //generating html of chatters list
    $.foreach(chatters).append('')//to fix
  })

  socket.on('incomingChat',function(data){
    alert('incoming chat from ' + data.senderUsername +  ' message : ' + data.message);
  })
}

socket.on('authenticated', function () {
    console.log('- authenticated');
 }).on('disconnect', function () {
      console.log('- disconnected');
});

$('#login').submit(function (e) {
  e.preventDefault();
  $.post('/login', {
    username: $('#username').val(),
    password: $('#password').val()
  }).done(function (result) {
    connect_socket(result.token);
  });
});
