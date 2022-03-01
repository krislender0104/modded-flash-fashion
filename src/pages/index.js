import Head from "next/head";
import { ChakraProvider, Flex, Box, Link, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import CameraView from "../components/cameraView/CameraView";
import Sidebar from "../components/sidebar/Sidebar";
import dynamic from 'next/dynamic'
// import * as girlSVG from '../modules/resources/illustration/girl.svg';
// import * as boySVG from '../modules/resources/illustration/boy.svg';
// import * as abstractSVG from '../modules/resources/illustration/abstract.svg';
// import * as blathersSVG from '../modules/resources/illustration/blathers.svg';
// import * as tomNookSVG from '../modules/resources/illustration/tom-nook.svg';
import * as garment1SVG from '../modules/resources/illustration/garment_1_NPvector4Clean+Skeleton.svg';
import * as garment2SVG from '../modules/resources/illustration/3green_Garment2_2+SKL.svg';
import * as skirtPaths from '../modules/resources/illustration/3skirtpaths+SKL.svg';
import * as bluePurpleGarment5cc from '../modules/resources/illustration/3bluePurpleGarment5cc+SKL.svg';
import { checkVideoConverted, uploadVideo } from '../services/video';
import { serverUrl } from '../services/config';
import { maxRecordLength } from '../constants';
import Modal from '../components/modal';

const avatarSvgs = {
  // 'girl': girlSVG.default,
  // 'boy': boySVG.default,
  // 'abstract': abstractSVG.default,
  // 'blathers': blathersSVG.default,
  // 'tom-nook': tomNookSVG.default,
  'garment1': garment1SVG.default,
  'garment2': garment2SVG.default,
  'skirtPaths': skirtPaths.default,
  'bluePurple': bluePurpleGarment5cc.default
};

const DynamicComponent = typeof window !== 'undefined' && dynamic(() => import('../modules/camera.js'))

let screenStream = null
let screenVideo = null
let screenRecorder = null
let screenCanvas = null
let screenCanvasContext = null
let computedHeight = null
let compHeight = null
let compWidth = null

if(typeof window != 'undefined') {
  screenVideo = document.getElementById("screenVideo")
  screenCanvas = document.getElementById("screenCanvas")
  screenCanvasContext = screenCanvas.getContext("2d")
}

const getScreenStream = (callback) => {
  if (navigator.getDisplayMedia) {
      navigator.getDisplayMedia({
          video: true
      }).then(stream => {
          callback(stream);
      });
  } else if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia({
          video: true
      }).then(stream => {
          callback(stream);
      });
  } else {
      console.log('getDisplayMedia API is not supported by this browser.');
  }
}

const Home = () => {
  const [isCameraLoaded, setIsCameraLoaded] = useState(false)
  const [currentSVG, setCurrentSVG] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const downloadButtonRef = useRef(null)
  
  const [downloadDelayShown, setDownloadDelayShown] = useState(false)
  const [timeoutModalShown, setTimeoutModalShown] = useState(false)
  const [downloadEnabled, setDownloadEnabled] = useState(false)

  const timeoutId = useRef()
  const downloadCheckTimeId = useRef()

  const CropFrame = function (screenVideo) {
    screenCanvasContext.drawImage(screenVideo, 0, -compHeight * computedHeight, screenVideo.videoWidth, compHeight)
  }

  const triggerStart = useCallback(async ()=>{
    if(screenRecorder == null) {
      getScreenStream((stream)=>{
        screenStream = stream
        let isFirstVideoPlay = true
        screenVideo.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        screenVideo.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        screenStream.oninactive = () => {
          console.info("Recording inactive");
          triggerStop()
        }
        screenVideo.ontimeupdate = function(e) {
          CropFrame(screenVideo);

          if(isFirstVideoPlay) {
            computedHeight = (window.outerHeight - window.innerHeight) / window.outerHeight
            compWidth = screenVideo.videoWidth ? screenVideo.videoWidth * 0.6 : screenVideo.width * 0.6
            compHeight = (screenVideo.videoHeight ? screenVideo.videoHeight : screenVideo.height) * (1 - computedHeight)
            console.log("compwidth", compWidth, "compheight", compHeight)
            screenCanvas.width = compWidth
            screenCanvas.height = compHeight
            isFirstVideoPlay = false

            timeoutId.current = setTimeout(() => {
              if (
                screenRecorder &&
                screenRecorder.state == 'recording'
              ) {
                triggerStop();
                setTimeoutModalShown(true);
                setDownloadDelayShown(false);
              }
            }, maxRecordLength * 1000);
            
            setDownloadEnabled(false)
            const screenCanvasStream = screenCanvas.captureStream()
            screenRecorder = new MediaRecorder(screenCanvasStream, { mimeType: 'video/webm;codecs=h264' })
            setIsRecording(true)
            let screenChunks = []
            screenRecorder.ondataavailable = e => {
              screenChunks.push(e.data)
              !isRecording && setIsRecording(false)
            }
            screenRecorder.onstop = e => {
              const screenBlob = new Blob(screenChunks)

              uploadVideo(screenBlob).then((resp) => {
                downloadButtonRef.current.href = `${serverUrl}/download/?file=${resp.fileName}`;

                if (downloadCheckTimeId.current) {
                  clearTimeout(downloadCheckTimeId.current);
                  clearInterval(downloadCheckTimeId.current);
                }

                downloadCheckTimeId.current = setTimeout(() => {
                  downloadCheckTimeId.current = setInterval(() => {
                    checkVideoConverted(downloadButtonRef.current.href).then(converted => {
                      if (converted) {
                        setDownloadEnabled(true);
                        setTimeoutModalShown(false);
                        setDownloadDelayShown(false);

                        clearInterval(downloadCheckTimeId.current);
                      }
                    })
                  }, 5 * 1000)
                }, 15 * 1000)
              });

              screenRecorder = null
              setIsRecording(false)
            }
            screenRecorder.start()
          }
        };
        
        if ('srcObject' in screenVideo) {
          screenVideo.srcObject = screenStream;
        } else {
          screenVideo.src = URL.createObjectURL(screenStream);
        }
        screenVideo.screen = screenStream
        screenVideo.play()
      })
    }
    else if(screenRecorder.state == "recording") {
      console.log("Aleady recording video")
    }
    else {
      console.log("Edge case caught")
    }
  })

  const triggerStop = useCallback(()=>{
    clearTimeout(timeoutId.current);
    const stopButton = document.querySelector("#stopButton")
    stopButton.classList.add("clicked")

    if(screenRecorder && screenRecorder.state == "recording") {
      screenRecorder.stop()
      screenStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    else {
      console.log("Not recording video")
    }
    setTimeout(() => {
      stopButton.classList.remove("clicked")
    }, 200);
  })

  const triggerShuffle = useCallback(()=>{
    const shuffleButton = document.querySelector("#shuffleButton")
    shuffleButton.classList.add("clicked")

    let avatarLength = Object.keys(avatarSvgs).length
    let newSvgIndex = Math.floor(Math.random() * (avatarLength))
    
    while(newSvgIndex === currentSVG) {
      newSvgIndex = Math.floor(Math.random() * (avatarLength))
    }
    if(currentSVG != newSvgIndex) {
      console.log(currentSVG, " -> ", newSvgIndex)
      setCurrentSVG(newSvgIndex)
    }
    
    setTimeout(() => {
      shuffleButton.classList.remove("clicked")
    }, 200);
  })

  const triggerDownload = useCallback(()=>{
    const downloadButton = document.querySelector("#downloadButton")
    downloadButton.classList.add("clicked")

    const link = downloadButtonRef.current.getAttribute('href');
    if (link !== '#') {
      checkVideoConverted(link).then((converted) => {
        if (converted) {
          downloadButtonRef.current.click();
        }
      });
    }

    setTimeout(() => {
      downloadButton.classList.remove("clicked")
    }, 200);
  })

  return (
    <ChakraProvider>
      <Box>
        <Head>
          <title>FLASH FASHION</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Box as="main" backgroundColor="black">
          {
            typeof window !== 'undefined' ?
            <DynamicComponent
              setIsCameraLoaded={setIsCameraLoaded}
              currentSVG={Object.values(avatarSvgs)[currentSVG]}
            /> : 
            undefined
          }
          <Flex
            direction={{ base: "column", lg: "row" }}
            width="100vw"
            height="100vh"
          >
            <Box
              width={{base:"100%", lg:"60%"}}
              style={{ position: 'relative' }}
            >
              {downloadDelayShown && (
                <Modal onClose={() => setDownloadDelayShown(false)}>
                  <Text fontSize='15px' marginRight={{ base: '4' }}>
                    Please wait 20 seconds before clicking the download button! Thanks! 
                  </Text>
                </Modal>
              )}
              {timeoutModalShown && (
                <Modal onClose={() => setTimeoutModalShown(false)}>
                  <Text fontSize='15px' marginRight={{ base: '4' }}>
                    Max{' '}
                    <span style={{ color: '#FF5D5D' }}>
                      {maxRecordLength} seconds
                    </span>{' '}
                    record time. Download and save!
                  </Text>
                  <Text fontSize='15px' marginRight={{ base: '4' }}>
                    Please wait 20 seconds before clicking the download button! Thanks! 
                  </Text>
                </Modal>
              )}
              <CameraView isCameraLoaded={isCameraLoaded} />
            </Box>
            <Box
              width={{base:"100%", lg:"40%"}}
            >
              <Sidebar
                shuffle={triggerShuffle}
                record={triggerStart}
                stop={() => {
                  setTimeoutModalShown(false);
                  setDownloadDelayShown(true);
                  triggerStop();
                }}
                download={triggerDownload}
                isRecording={isRecording}
                downloadEnabled={downloadEnabled}
              />
            </Box>
          </Flex>
          <Link className="download" href="#" download="flashfashion.mp4" display="none" ref={downloadButtonRef}></Link>
        </Box>
      </Box>
    </ChakraProvider>
  );
}

export default Home