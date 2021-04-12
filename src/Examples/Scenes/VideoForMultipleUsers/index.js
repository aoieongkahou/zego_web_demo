// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js
let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0004'
let streamID = '0004'

let zg = null;
let isChecked = false;
let isLoginRoom = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;
let playMultipleStreamList = [];
let palyedObj = {};
let playMultipleUserList = [];

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

function logoutRoom(roomId) {
  if(localStream) {
    stopPublishingStream($('#pushlishInfo-id').text())
  }
  if(remoteStream) {
    stopPlayingStream($('#playInfo-id').text())
  }
  zg.logoutRoom(roomId)
  clearStream('room')
}

async function startPublishingStream (streamId, config) {
  try {
    localStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localStream);
    $('#pubshlishVideo')[0].srcObject = localStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function stopPublishingStream(streamId) {
  zg.stopPublishingStream(streamId)
  if(remoteStream) {
    stopPlayingStream($('#playInfo-id').text())
  }
  clearStream('publish')
}

async function startPlayingStream(streamId, options = {}) {
  try {
    remoteStream = await zg.startPlayingStream(streamId, options)
    $('#playVideo')[0].srcObject = remoteStream;
    return true
  } catch (err) {
    return false
  }
}

async function startPlayingMultipleStream(streamId, options = {}) {
  try {
    const stream = await zg.startPlayingStream(streamId, options)
    $(`#${streamId} video`)[0].srcObject = stream;
    return true
  } catch (err) {
    return false
  }
}

async function stopPlayingStream(streamId) {
  zg.stopPlayingStream(streamId)
  clearStream()
}


$('#startPublishing').on('click', util.throttle( async function () {
  this.classList.add('border-primary')
  if(!published) {
      const flag =  await startPublishingStream(streamID, getCreateStreamConfig());
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        published = true
        changeVideo()
      } else {
        changeVideo(true)
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Publishing Fail'
      }

  } else {
      if(remoteStream) {
      // $('#PlayID')[0].disabled = false
        updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
      }
      stopPublishingStream(streamID);
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      published = false
      // $('#PublishID')[0].disabled = false
  }
}, 500))

$('#startPlaying').on('click', util.throttle( async function () {
  this.classList.add('border-primary')
  if(!played) {
      const config = {
        video: $('#Video')[0].checked,
        audio: $('#Audio')[0].checked
      }
      const flag =  await startPlayingStream(streamID, config);
      if(flag) {
        updateButton(this, 'Start Playing', 'Stop Playing');
        played = true
        changeVideo()
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Playing Fail'
        changeVideo(true)
      }

  } else {
      stopPlayingStream(streamID);
      updateButton(this, 'Start Playing', 'Stop Playing')
      played = false
  }
}, 500))


function getCreateStreamConfig() {
  const resolution = $('#captureResolution').val().split('*')
  const config = {
    camera: {
      audioInput: 'default',
      videoInput: $('#CameraDevices').val(),
      video:  $('#Camera')[0].checked,
      audio: $('#Microphone')[0].checked,
      videoQuality: 4,
      frameRate: $('#FPS').val() * 1,
      width: resolution[0] * 1,
      height: resolution[1] * 1,
      bitRate: $('#Bitrate').val()  * 1
    },
  }
  return config
}

function initEvent() {
  zg.on('publisherStateUpdate', result => {
    if(result.state === "PUBLISHING") {
      $('#pushlishInfo-id').text(result.streamID)
    } else if(result.state === "NO_PUBLISH") {
      $('#pushlishInfo-id').text('')
    }
  })

  zg.on('playerStateUpdate', result => {
    if(result.state === "PLAYING") {
      $('#playInfo-id').text(result.streamID)
    } else if(result.state === "NO_PLAY") {
      $('#playInfo-id').text('')
    }
  })

  zg.on('publishQualityUpdate', (streamId, stats) => {
    $('#publishResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`) 
    $('#sendBitrate').text(parseInt(stats.video.videoBitrate))
    $('#sendFPS').text(parseInt(stats.video.videoFPS))
    $('#sendRTT').text(parseInt(stats.video.videoFPS))
    $('#sendPacket').text(parseInt(stats.video.videoPacketsLostRate))
  })
}

function clearStream(flag) {
  if(localStream && flag) {
    zg.destroyStream(localStream);
  }
  if(remoteStream) {
    zg.destroyStream(remoteStream);
  }
  if(flag) {
    $('#pubshlishVideo')[0].srcObject = null;
    localStream = null;
  }
  $('#playVideo')[0].srcObject = null;
  remoteStream = null;
  if(flag === 'room') {
    isLoginRoom = false
  }
  if(flag === 'room' || flag === 'publish') {
    published = false
  }

  played = false
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

function changeVideo(flag) {
  if(flag) {
    $('#pubshlishVideo').css('transform', 'none')
    $('#playVideo').css('transform', 'none')
    return
  }
  const value =  $('#Mirror').val()
  if(value === 'onlyPreview') {
    $('#pubshlishVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'onlyPlay'){
    $('#playVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'both') {
    $('#pubshlishVideo').css('transform', 'scale(-1, 1)')
    $('#playVideo').css('transform', 'scale(-1, 1)')
  }
}

function playMultipleEvent() {
  zg.on('playQualityUpdate', (streamId, stats) => {
    if (streamId === '0004') {
      $('#playResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`) 
      $('#receiveBitrate').text(parseInt(stats.video.videoBitrate))
      $('#receiveFPS').text(parseInt(stats.video.videoFPS))
      $('#receivePacket').text(parseInt(stats.video.videoPacketsLostRate))
    } else {
      const spanList = $(`#${streamId} span`)
      spanList[0].innerText = `${stats.video.frameWidth} * ${stats.video.frameHeight}`
      spanList[1].innerText = parseInt(stats.video.videoBitrate)
      spanList[2].innerText = parseInt(stats.video.videoFPS)
      spanList[3].innerText = parseInt(stats.video.videoPacketsLostRate)
    }
  })

  zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
    console.log(roomID, updateType, streamList);
    if(updateType === 'ADD') {
      for(let i = 0; i < streamList.length; i++) {
        playMultipleStreamList.push(streamList[i])
        palyedObj[streamList[i].streamID] = false
        appednHtml(streamList[i].streamID, streamList[i].user)
        addMultiplePlayingEvent(streamList[i].streamID)
      }
    } else if (updateType == 'DELETE') {
      console.log(streamList);
      for(let k = 0; k < playMultipleStreamList.length; k++) {
        for(let j = 0; j < streamList.length; j++) {
          if (playMultipleStreamList[k].streamID === streamList[j].streamID) {
            try {
              zg.stopPlayingStream(playMultipleStreamList[k].streamID);
            } catch (error) {
              console.error(error);
            }
            removeHtml(playMultipleStreamList[k].streamID, streamList[k].user)
            playMultipleStreamList.splice(k--, 1);
            break;
          }
        }
      }
    }

    $('#streamList').text(`StreamList (${playMultipleStreamList.length})`)
  })
  zg.on('roomUserUpdate', (roomID, updateType, userList) => {
    console.log('sssss');
    if(updateType === 'ADD') {
      for(let i = 0; i < userList.length; i++) {
        console.log(111);
        playMultipleUserList.push(userList[i]);
        appednHtml(null, userList[i])
      }
    } else {
      for(let k = 0; k < playMultipleUserList.length; k++) {
        for(let j = 0; j < userList.length; j++) {
          if(playMultipleUserList[k].userID === userList[j].userID) {
            removeHtml(playMultipleUserList[k])
            playMultipleUserList.splice(k--, 1)
            break;
          }
        }
      }
    }
    $('#userList').text(`UserList (${playMultipleUserList.length})`)
  });
}

function initEventPlay() {
  zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
    if (updateType == 'ADD') {
        for (let i = 0; i < streamList.length; i++) {
            console.info(streamList[i].streamID + ' was added');
            let remoteStream;
            let playOption;

            zg.startPlayingStream(streamList[i].streamID, playOption).then(stream => {
                remoteStream = stream;
                useLocalStreamList.push(streamList[i]);
                let videoTemp = $(`<video id=${streamList[i].streamID} autoplay muted playsinline controls></video>`)
                //queue.push(videoTemp)
                $('.remoteVideo').append(videoTemp);
                const video = $('.remoteVideo video:last')[0];
                console.warn('video', video, remoteStream);
                video.srcObject = remoteStream;
                video.muted = false;
                // videoTemp = null;
            }).catch(err => {
                console.error('err', err);
            });

        }
    } else if (updateType == 'DELETE') {
        for (let k = 0; k < useLocalStreamList.length; k++) {
            for (let j = 0; j < streamList.length; j++) {
                if (useLocalStreamList[k].streamID === streamList[j].streamID) {
                    try {
                        zg.stopPlayingStream(useLocalStreamList[k].streamID);
                    } catch (error) {
                        console.error(error);
                    }

                    $('.remoteVideo video:eq(' + k + ')').remove();
                    useLocalStreamList.splice(k--, 1);
                    break;
                }
            }
        }
    }
  });
}

function appednHtml(streamId, user) {
  if(streamId) {
    $('#videoList').append(
      `<div class="preview-playInfo col-6 m-t-10" id="${streamId}">
        <div class="preview-content">
        <div class="preview-action">
          <div class="preview-info">
            <div>Resolution: <span></span></div>
            <div>Video Send Bitrate: <span></span></div>
            <div>Video Send FPS: <span></span></div>
            <div>Packet Loss: <span></span></div>
          </div>
          <div class="preview-video-action">
            <div class="font-12 publish-check m-b-5 m-t-5">
              <div class="check-wrappre m-r-5">
                <label class="form-check-label m-r-5">Video</label>
                <input class="check-input" type="checkbox" checked>
              </div>
              <div class="check-wrappre">
                <label class="form-check-label m-r-5">Audio</label>
                <input class="check-input" type="checkbox" checked>
              </div>
            </div>
            <button id='b-${streamId}' class="m-b-5 play-pause-button">Start Playing</button>
          </div>
        </div>
        <video autoplay muted playsinline></video>
      </div>
      <div class="font-12 t-nowrap">
        <span class="m-r-5">${user.userName}</span>
        StreamID: <span>${streamId}</span>
      </div>
    </div>`
    )
    $('#streamListUl').append(`
    <li id="l-${streamId}">
    <div class="drop-item">
      <span class="f-b-3 t-nowrap m-r-5">StreamID: ${streamId}</span>
      <span class="f-b-3 t-nowrap m-r-5">UserID: ${user.userID}</span>
      <span class="f-b-3 t-nowrap ">Name: ${user.userName}</span>
    </div>
    </li>
    `)
  }

  if(!streamId && user) {
    $('#userListUl').append(`
    <li id="${user.userID}">
    <div class="drop-item">
      <span class="f-b-5 t-nowrap m-r-5">UserID: ${user.userID}</span>
      <span class="f-b-5 t-nowrap ">Name: ${user.userName}</span>
    </div>
    </li>
    `)
  }
}

function removeHtml(streamId, user) {
  if(streamId) {

    $(`#${streamId}`).remove()
    $(`#l-${streamId}`).remove()
  }

  if(!streamId && user) {
    $(`${user.userID}`).remove()
  }
}

function addMultiplePlayingEvent(streamId) {
  $(`#b-${streamId}`).on('click',  util.throttle(async function() {
    const selectId = this.id.split('-')[1]
    const configInput = $(`#${selectId} input`)
    this.classList.add('border-primary')
    if(!palyedObj[streamId]) {
      const config = {
        video: configInput[0].checked,
        audio: configInput[1].checked
      }
      const flag =  await startPlayingMultipleStream(streamId, config);
      if(flag) {
        updateButton(this, 'Start Playing', 'Stop Playing');
        palyedObj[streamId] = true
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Playing Fail'
      }
    } else {
      stopPlayingStream(streamId);
      updateButton(this, 'Start Playing', 'Stop Playing')
      const spanList = $(`#${streamId} span`)
      spanList[0].innerText = ''
      spanList[1].innerText = ''
      spanList[2].innerText = ''
      spanList[3].innerText = ''
      spanList[4].innerText = ''
      palyedObj[streamId] = false
    }
  }, 500))
}

async function render() {
  $('#roomInfo-id').text(roomID)
  $('#RoomID').val(roomID)
  $('#UserName').val(userID)
  $('#UserID').val(userID)
  $('#PublishID').val(streamID)
  createZegoExpressEngine()
  await checkSystemRequirements()
  enumDevices()
  playMultipleEvent()
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