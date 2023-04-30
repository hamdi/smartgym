/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tf from '@tensorflow/tfjs';
import {setThreadsCount, setWasmPaths} from '@tensorflow/tfjs-backend-wasm';
import * as tfd from '@tensorflow/tfjs-data';
import * as posedetection from '@tensorflow-models/pose-detection';

import {Timer} from './timer.js';
import * as ui from './ui';

// Config
let conf_thresh = 0.4;

// Variables initialization
let minutes = 00; 
let seconds = 00; 
let appendSeconds = document.getElementById("seconds")
let appendMinutes = document.getElementById("minutes")
let buttonReset = document.getElementById('button-reset');
let Interval ;
const timer = new Timer();

let pushUpStart = 0;
let pushUpCount = 0;
let isPredicting = false;

let webcam = document.getElementById('webcam');
let webcam_iterator;

let model;

// To load the model
async function loadModel() {
  const detector = await posedetection.createDetector(posedetection.SupportedModels.MoveNet);
  return detector;
}

// To find the angle between 3 points
function find_angle(A,B,C) {
  var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));
  var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2));
  var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
  return ((Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB))* 180) / Math.PI);
}

async function predict() {
    
  while (isPredicting) {
    // Make a prediction through our detector model
    const pose_results = await model.estimatePoses(webcam);
    if (pose_results.length>0){
      const results = await pose_results[0].keypoints;

      // compute elbow angles
      const left_wrist = {x:results[9].x, y:results[9].y};
      const right_wrist = {x:results[10].x, y:results[10].y};
      const left_elbow = {x:results[7].x, y:results[7].y};
      const right_elbow = {x:results[8].x, y:results[8].y};
      const left_shoulder = {x:results[5].x, y:results[5].y};
      const right_shoulder = {x:results[6].x, y:results[6].y};
  
      const left_angle = find_angle(left_shoulder, left_elbow, left_wrist);
      const right_angle = find_angle(right_shoulder, right_elbow, right_wrist);
  
      const left_conf = (results[9].score + results[7].score +results[5].score)/3;
      const right_conf = (results[10].score + results[8].score +results[8].score)/3;
      const conf = (left_conf + left_conf) / 2;
  
      if ((left_angle < 110) && (right_angle < 110) && (conf>conf_thresh)){
      pushUpStart = 1;
      } else if ((pushUpStart==1) && (left_angle > 150) && (right_angle > 150)
              && (conf>conf_thresh)){
      pushUpCount++;
      pushUpStart = 0;
      }
  
      ui.writePushups(pushUpCount.toFixed());
      //console.log('LA:' + left_angle.toFixed() + ' RA: ' + right_angle.toFixed() + ' LC:' + left_conf.toFixed(2) + ' RC: ' + right_conf.toFixed(2))
    }
    await tf.nextFrame();
  }
}

function startTimer () {
  const timeInSeconds = Math.round(timer.getTime() / 1000);
  if ((seconds+60*minutes)<timeInSeconds){
    seconds = timeInSeconds % 60;
    minutes= Math.floor(timeInSeconds / 60);
    
    if(seconds <= 9){
      appendSeconds.innerHTML = "0" + seconds;
    }
    else if (seconds > 9){
      appendSeconds.innerHTML = seconds;
    }
    if(seconds < 5 && minutes <= 9){
      // only try to update minutes when a new minute starts (seconds < 5)
      appendMinutes.innerHTML = "0" + minutes;
    }
    else if (seconds < 5 && minutes > 9){
      appendMinutes.innerHTML = minutes;
    } 
}
}

var statusButton = document.getElementById("status");

statusButton.addEventListener("click", Start);

async function Start(){
    console.log("Started");
    statusButton.removeEventListener("click", Start);
    statusButton.addEventListener("click", Stop);

    timer.start();
    clearInterval(Interval);
    Interval = setInterval(startTimer, 200)

    statusButton.innerText = "Stop";
    
    isPredicting = true;
    predict();
}

async function Stop(){
    console.log("Stopped");
    statusButton.removeEventListener("click", Stop);
    statusButton.addEventListener("click", Start);
    statusButton.innerText = "Start";
    clearInterval(Interval);
    timer.stop();
    isPredicting = false;
}

buttonReset.onclick = function() {
  pushUpCount = 0;
  ui.writePushups("0");

  seconds = 00;
  minutes = 00;
  appendSeconds.innerHTML = "0" + seconds;
  appendMinutes.innerHTML = "0" + minutes;
  timer.reset ();
}

const saveButton = document.getElementById("button-save");
saveButton.addEventListener("click", Save);

async function Save(){
  const rndInt = Math.floor(Math.random() * 1000)
  const { value: username } = await Swal.fire({
    title: 'Enter your username',
    input: 'text',
    inputLabel: 'Note: It will be publicly visible in the leaderboard.',
    inputValue: "Anonymous"+rndInt,
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value) {
        return 'You need to write something!'
      }
    }
  })
  console.log(username);

  //const username = prompt("Please enter your username.\nNote: It will be publicly visible in the leaderboard.", "Anonymous"+rndInt);
  if (username!=null){
    const req_body = JSON.stringify({name: username, score: pushUpCount});
    console.log(req_body);
    const response = await fetch('https://f2r1su6iai.execute-api.eu-west-1.amazonaws.com/deploy',
      {method: 'POST', headers: {'Content-Type': 'application/json'}, body: req_body});
    Swal.fire(
      'Score submitted!',
      'Head to the leaderboard to check if your submission was accepted!',
      'success'
    )
  }
}


document.getElementById('source').addEventListener('change', async function() {
  if (this.value.substring(0,4)=='demo'){
    if ((webcam_iterator!=null) && (webcam_iterator.isClosed==false)){webcam_iterator.stop();}
    var source = document.getElementById('vidsrc');
    webcam.pause();
    webcam.crossOrigin = "Anonymous";
    source.setAttribute('src', 'https://hamdi-smartgym.s3.us-east-2.amazonaws.com/demos/'+this.value+'.mp4');
    webcam.setAttribute('height', 480);
    webcam.setAttribute('width', 852);
    webcam.load();
    webcam.play();
    webcam = document.getElementById('webcam');
  }
  else if (this.value=='webcam'){
    try {
      webcam_iterator = await tfd.webcam(document.getElementById('webcam'));
    } catch (e) {
      console.log(e);
      document.getElementById('no-webcam').style.display = 'block';
    }
    
  }
  else if (this.value=='upload'){
    //webcam = await tf.browser.fromPixelsAsync(document.getElementById('webcam'));
  }
});


document.getElementById('backend').addEventListener('change', async function() {
  if (this.value=="wasm"){
    setWasmPaths(`${window.location.href}/`);
    setThreadsCount(4);
  }
  await tf.setBackend(this.value);
});



async function init() {
  try {
    webcam_iterator = await tfd.webcam(document.getElementById('webcam'));
  } catch (e) {
    console.log(e);
    document.getElementById('no-webcam').style.display = 'block';
  }

  model = await loadModel();

  ui.init();

}

// Initialize the application.
init();
