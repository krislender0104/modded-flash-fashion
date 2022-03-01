/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as posenet_module from '@tensorflow-models/posenet';
import * as facemesh_module from '@tensorflow-models/facemesh';
import * as tf from '@tensorflow/tfjs';
import * as paper from 'paper';
import dat from 'dat.gui';
import Stats from 'stats.js';
import "babel-polyfill";

import {drawPoint, drawSkeleton, isMobile, toggleLoadingUI, setStatusText} from '../utils/demoUtils';
import {SVGUtils} from './../utils/svgUtils'
import {PoseIllustration} from './illustrationGen/illustration';
import {Skeleton, facePartName2Index} from './illustrationGen/skeleton';
import {FileUtils} from './../utils/fileUtils';
import { useEffect } from "react"

// WINDOW SIZE

let windS = window.innerWidth
|| document.documentElement.clientWidth
|| document.body.clientWidth;
let doheight = window.innerHeight
  || document.documentElement.clientHeight
  || document.body.clientHeight;
let ismob = false;
if(windS > 768) {
  windS = 930;
} else {
  ismob = true;
}

// Camera stream video element
let video;
let videoWidth = windS;
let videoHeight = doheight;

// Canvas
let faceDetection = null;
let illustration = null;
let canvasScope;
let canvasWidth = windS;
let canvasHeight = doheight+60;
// ML models
let facemesh;
let posenet;
let minPoseConfidence = 0.15;
let minPartConfidence = 0.1;
let nmsRadius = 30.0;

// Misc
let mobile = false;
const stats = new Stats();


/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: videoWidth,
      height: videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const defaultPoseNetArchitecture = 'ResNet50';
const defaultQuantBytes = 4;
const defaultMultiplier = 1.0;
const defaultStride = 16;
const defaultInputResolution = 100;

function detectPoseInRealTime(video) {
  const canvas = document.getElementById('output');
  const videoCtx = canvas.getContext('2d');

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    // Begin monitoring code for frames per second
    //stats.begin();

    let poses = [];
   
    videoCtx.clearRect(0, 0, videoWidth, videoHeight);
    // Draw video
    videoCtx.save();
    videoCtx.scale(-1, 1);
    videoCtx.translate(-videoWidth, 0);
    videoCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
    videoCtx.restore();

    // Creates a tensor from an image
    const input = tf.browser.fromPixels(canvas);
    faceDetection = await facemesh.estimateFaces(input, false, false);
    let all_poses = await posenet.estimatePoses(video, {
      flipHorizontal: true,
      decodingMethod: 'multi-person',
      maxDetections: 1,
      scoreThreshold: minPartConfidence,
      nmsRadius: nmsRadius
    });

    poses = poses.concat(all_poses);
    input.dispose();

    canvasScope.project.clear();

    if (poses.length >= 1 && illustration) {
      Skeleton.flipPose(poses[0]);

      if (faceDetection && faceDetection.length > 0) {
        let face = Skeleton.toFaceFrame(faceDetection[0]);
        illustration.updateSkeleton(poses[0], face);
      } else {
        illustration.updateSkeleton(poses[0], null);
      }
      illustration.draw(canvasScope, videoWidth, videoHeight);
    }

    canvasScope.project.activeLayer.scale(
      canvasWidth / videoWidth, 
      canvasHeight / videoHeight, 
      new canvasScope.Point(0, 0));

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

function setupCanvas() {
  //mobile = isMobile();
  /*if (mobile) {
    canvasWidth = Math.min(window.innerWidth, window.innerHeight);
    canvasHeight = canvasWidth;
    videoWidth *= 0.7;
    videoHeight *= 0.7;
  }*/

  canvasScope = paper.default;
  let canvas = document.querySelector('.illustration-canvas');;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvasScope.setup(canvas);
  if(ismob){
    document.getElementById('cc').style.height =  windS-60+"px";
    // document.getElementById('sb').style.height =  "1365px";
  }else {
    document.getElementById('cc').style.height =  doheight+"px";
    document.getElementById('sb').style.height =  doheight+"px";
  }
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export default function bindPage({setIsCameraLoaded, currentSVG}) {

  useEffect(()=>{
    async function initializeCamera () {
      setupCanvas();
    
      console.log('Loading PoseNet model...');
      posenet = await posenet_module.load();
      console.log('Loading FaceMesh model...');
      facemesh = await facemesh_module.load();
    
      console.log('Loading Avatar file...');
      await parseSVG(currentSVG);
    
      console.log('Setting up camera...');
      document.getElementById("overlay").style.display = "none";
      try {
        video = await loadVideo();
        setIsCameraLoaded(true)
      } catch (e) {
        console.log("This device type is not supported yet");
        throw e;
      }
      detectPoseInRealTime(video, posenet);
    }
    initializeCamera()
  },[])

  useEffect(()=>{
    async function reloadAvatar () {
      console.log('Loading New Avatar file...');
      await parseSVG(currentSVG);
    }
    reloadAvatar()
  },[currentSVG])

  return <></>
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
FileUtils.setDragDropHandler((result) => {parseSVG(result)});

async function parseSVG(target) {
  let svgScope = await SVGUtils.importSVG(target /* SVG string or file path */);
  let skeleton = new Skeleton(svgScope);
  illustration = new PoseIllustration(canvasScope);
  illustration.bindSkeleton(skeleton, svgScope);
}