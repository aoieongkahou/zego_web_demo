// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js

// ============================================================== 
// This part of the code defines the default values and global values 
// ============================================================== 

let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0014'
let streamID = '0014'

let zg = null;
let isChecked = false;
let isLoginRoom = false;
let localStream = null;
let remoteStream = null;
let published = false;
let isPlay = false;
// part end

// ============================================================== 
// This part of the code uses the SDK
// ==============================================================  

function createZegoExpressEngine() {
  zg = new ZegoExpressEngine(appID, server);
  window.zg = zg
}

async function checkSystemRequirements() {
  console.log('sdk version is', zg.getVersion());
  try {
      const result = await zg.checkSystemRequirements();

      console.warn('checkSystemRequirements ', result);
      !result.videoCodec.H264 && $('#videoCodeType option:eq(1)').attr('disabled', 'disabled');
      !result.videoCodec.VP8 && $('#videoCodeType option:eq(2)').attr('disabled', 'disabled');

      if (!result.webRTC) {
          console.log('browser is not support webrtc!!');
          return false;
      } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
        console.log('browser is not support H264 and VP8');
          return false;
      } else if (result.videoCodec.H264) {
          supportScreenSharing = result.screenSharing;
          if (!supportScreenSharing) console.log('browser is not support screenSharing');
          previewVideo = $('#previewVideo')[0];
          // start();
      } else {
        console.log('不支持H264，请前往混流转码测试');
      }

      return true;
  } catch (err) {
      console.error('checkSystemRequirements', err);
      return false;
  }
}

async function enumDevices() {
  const audioInputList = [],
      videoInputList = [];
  const deviceInfo = await zg.enumDevices();

  deviceInfo &&
      deviceInfo.microphones.map((item, index) => {
          if (!item.deviceName) {
              item.deviceName = 'microphone' + index;
          }
          audioInputList.push(' <option value="' + item.deviceID + '">' + item.deviceName + '</option>');
          console.log('microphone: ' + item.deviceName);
          return item;
      });

  deviceInfo &&
      deviceInfo.cameras.map((item, index) => {
          if (!item.deviceName) {
              item.deviceName = 'camera' + index;
          }
          videoInputList.push(' <option value="' + item.deviceID + '">' + item.deviceName + '</option>');
          console.log('camera: ' + item.deviceName);
          return item;
      });

  audioInputList.push('<option value="0">禁止</option>');
  videoInputList.push('<option value="0">禁止</option>');

  $('#MirrorDevices').html(audioInputList.join(''));
  $('#CameraDevices').html(videoInputList.join(''));
}

function loginRoom(roomId, userId, userName) {
  return new Promise((resolve, reject) => {
    $.get(
      tokenUrl,
      {
        app_id: appID,
        id_name: userID
      },
      async (token) => {
        try {
          await zg.loginRoom(roomId, token, {
            userID: userId,
            userName
          });
          resolve()
        } catch (err) {
          reject()
        }
      }
    );
  })
}

async function startPublishingStream (streamId) {
  try {
    const stream = $('#customLocalVideo')[0].captrueStream();
    localStream = await zg.createStream({
      custom: {
        source: stream
      }
    });
    zg.startPublishingStream(streamId, localStream);
    $('#pubshlishVideo')[0].srcObject = localStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function stopPublishingStream(streamId) {
  zg.stopPublishingStream(streamId)
  if(remoteStream && $('#PublishID').val() === $('#PlayID').val()) {
    stopPlayingStream(streamId)
  }
  clearStream('publish')
}
// uses SDK end


// ============================================================== 
// This part of the code binds the button click event
// ==============================================================  

$('#startPlay').on('click', util.throttle( async function () {
  const url = $('#CustomVideo').val()
  if(!url) return alert('url is empty')

  $('#customLocalVideo')[0].src = url
  const flag = await checkVideo()
  if(flag) {
    isPlay = true
  } else {
    isPlay = false
    $('#CustomVideo').val('')
    alert('Playback failed')
  }
}, 500))

$('#startPublishing').on('click', util.throttle( async function () {
  if(!isPlay) return alert('must start play')
  const id = $('#PublishID').val();
  if(!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if(!published) {
      const flag =  await startPublishingStream(id);
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        published = true
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Publishing Fail'
      }

  } else {
      if(remoteStream && id === $('#PlayID').val()) {
      $('#PlayID')[0].disabled = false
        updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
      }
      stopPublishingStream(id);
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      published = false
      $('#PublishID')[0].disabled = false
  }
}, 500))

// bind event end


// ============================================================== 
// This part of the code bias tool
// ============================================================== 

function initEvent() {
  zg.on('publisherStateUpdate', result => {
    if(result.state === "PUBLISHING") {
      $('#pushlishInfo-id').text(result.streamID)
    } else if(result.state === "NO_PUBLISH") {
      $('#pushlishInfo-id').text('')
    }
  })

  zg.on('publishQualityUpdate', (streamId, stats) => {
    console.warn('publishQualityUpdate', streamId, stats);
  })
}

function clearStream(flag) {

  if(flag === 'publish') {
    localStream && zg.destroyStream(localStream);
    $('#pubshlishVideo')[0].srcObject = null;
    localStream = null;
    published = false
    if($('#PublishID').val() === $('#PlayID').val()) {
      remoteStream && zg.destroyStream(remoteStream);
      $('#playVideo')[0].srcObject = null;
      remoteStream = null;
      played = false
    }
  }

  if(flag === 'play') {
    remoteStream && zg.destroyStream(remoteStream);
    $('#playVideo')[0].srcObject = null;
    remoteStream = null;
    played = false
  }
}

function updateButton(button, preText, afterText) {
  if (button.classList.contains('playing')) {
    button.classList.remove('paused', 'playing', 'border-error', 'border-primary');
    button.classList.add('paused');
    button.innerText = afterText
  } else {
    if (button.classList.contains('paused')) {
      button.classList.remove('border-error', 'border-primary');
      button.classList.add('playing');
      button.innerText = preText
    }
  }
  if (!button.classList.contains('paused')) {
    button.classList.remove('border-error', 'border-primary');
    button.classList.add('paused');
    button.innerText = afterText
  }
}

function setLogConfig() {
  let config = localStorage.getItem('logConfig')
  const DebugVerbose = localStorage.getItem('DebugVerbose') === 'true' ? true : false
  if(config) {
    config = JSON.parse(config)
    zg.setLogConfig({
      logLevel: config.logLevel,
      remoteLogLevel: config.remoteLogLevel,
      logURL: '',
  });
  }
  zg.setDebugVerbose(DebugVerbose);
}

function checkVideo() {
  return new Promise((resolve) => {
    $('#customLocalVideo').on('error', function() {
      resolve(false)
    })
    $('#customLocalVideo').on('loadeddata', function() {
      resolve(true)
    })
    setTimeout(() => {
      resolve(false)
    }, 3000)
  })
}
// tool end

// ============================================================== 
// This part of the code Initialization web page
// ============================================================== 
async function render() {
  $('#roomInfo-id').text(roomID)
  $('#RoomID').val(roomID)
  $('#UserName').val(userID)
  $('#UserID').val(userID)
  $('#PublishID').val(streamID)
  createZegoExpressEngine()
  await checkSystemRequirements()
  enumDevices()
  initEvent()
  setLogConfig()
  try {
    await loginRoom(roomID, userID, userID)
    $('#roomStateSuccessSvg').css('display', 'inline-block')
    $('#roomStateErrorSvg').css('display', 'none')
  } catch (err) {
    $('#roomStateSuccessSvg').css('display', 'none')
    $('#roomStateErrorSvg').css('display', 'inline-block')
  }
}

render()

// Initialization end