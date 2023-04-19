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

//import {ControllerDataset} from './controller_dataset';
import {Timer} from './timer.js';
import * as ui from './ui';

console.log("app start");

// set button functionality
var minutes = 00; 
var seconds = 00; 
var appendSeconds = document.getElementById("seconds")
var appendMinutes = document.getElementById("minutes")
var buttonReset = document.getElementById('button-reset');
var Interval ;
const timer = new Timer();

var pushUpStart = 0;
var pushUpCount = 0;

// A webcam iterator that generates Tensors from the images from the webcam.
let webcam;

let model;

// Loads detector and returns a model that returns the internal activation
// we'll use as input to our classifier model.
async function loadModel(model_name) {
  const detector = await tf.loadGraphModel(
    'https://storage.googleapis.com/tfjs-models/tfjs/movenet_v4/'+model_name+'/float16/model.json');
  return detector;
}

function find_angle(A,B,C) {
  var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));    
  var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2)); 
  var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
  return ((Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB))* 180) / Math.PI);
}

let isPredicting = false;

async function predict() {
  ui.isPredicting();
    
  while (isPredicting) {
    // Capture the frame from the webcam.
    const img = await getImage();

    // Make a prediction through our detector model
    const results_tensor = model.predict(img);
    const results_all = await results_tensor.array();
    const results = results_all[0][0];

    // compute elbow angles
    const left_wrist = {x:results[9][0], y:results[9][1]};
    const right_wrist = {x:results[10][0], y:results[10][1]};
    const left_elbow = {x:results[7][0], y:results[7][1]};
    const right_elbow = {x:results[8][0], y:results[8][1]};
    const left_shoulder = {x:results[5][0], y:results[5][1]};
    const right_shoulder = {x:results[6][0], y:results[6][1]};

    const left_angle = find_angle(left_shoulder, left_elbow, left_wrist);
    const right_angle = find_angle(right_shoulder, right_elbow, right_wrist);

    const left_conf = (results[9][2] + results[7][2] +results[5][2])/3;
    const right_conf = (results[10][2] + results[8][2] +results[8][2])/3;

    if ((left_angle < 110) && (right_angle < 110) && (left_conf>0.5) && (right_conf>0.5)){
    pushUpStart = 1;
    } else if ((pushUpStart==1) && (left_angle > 150) && (right_angle > 150)
            && (left_conf>0.5) && (right_conf>0.5)){
    pushUpCount++;
    pushUpStart = 0;
    }

    ui.writePushups(pushUpCount.toFixed());
    console.log('LA:' + left_angle.toFixed() + ' RA: ' + right_angle.toFixed())
    //console.log('LC:' + left_conf.toFixed(2) + ' RC: ' + right_conf.toFixed(2))
    //const classId = (await predictedClass.data())[0];
    img.dispose();

    await tf.nextFrame();
  }
  ui.donePredicting();
}

/**
 * Captures a frame from the webcam then
 * returns a batched image (1-element batch) of shape [1, w, h, c].
 */
async function getImage() {
  const img = await webcam.capture();
  const processedImg =
      tf.tidy(() => img.resizeBilinear([256, 256]).expandDims(0).toInt());
  img.dispose();
  return processedImg;
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
    //console.log(seconds);
}

async function Stop(){
    console.log("Stopped");
    statusButton.removeEventListener("click", Stop);
    statusButton.addEventListener("click", Start);
    statusButton.innerText = "Start";
    clearInterval(Interval);
    timer.stop();
    isPredicting = false;
    //console.log(seconds);
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

document.getElementById('backend').addEventListener('change', async function() {
  if (this.value=="wasm"){
    setWasmPaths(`${window.location.href}/`);
    setThreadsCount(4);
  }
  await tf.setBackend(this.value);
});


async function init() {
  try {
    //const webcamConfig = {
    //  resizeWidth: 192,
    //  resizeHeight: 192};
    webcam = await tfd.webcam(document.getElementById('webcam'));//, webcamConfig);
  } catch (e) {
    console.log(e);
    document.getElementById('no-webcam').style.display = 'block';
  }
  model = await loadModel("thunder");

  ui.init();
}

// Initialize the application.
init();
