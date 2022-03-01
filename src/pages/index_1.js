import Head from 'next/head';
import { ChakraProvider, Flex, Box, Link, Text } from '@chakra-ui/react';
import { useCallback, useRef, useState } from 'react';
import CameraView from '../components/cameraView/CameraView';
import Sidebar from '../components/sidebar/Sidebar';
import dynamic from 'next/dynamic';
import * as garment1SVG from '../modules/resources/illustration/garment_1_NPvector4Clean+Skeleton.svg';
import * as garment2SVG from '../modules/resources/illustration/3green_Garment2_2+SKL.svg';
import * as skirtPaths from '../modules/resources/illustration/3skirtpaths+SKL.svg';
import * as bluePurpleGarment5cc from '../modules/resources/illustration/3bluePurpleGarment5cc+SKL.svg';
import { checkVideoConverted, uploadVideo } from '../services/video';
import { serverUrl } from '../services/config';
import Modal from '../components/modal';
import { maxRecordLength } from '../constants';

const avatarSvgs = {
  garment1: garment1SVG.default,
  garment2: garment2SVG.default,
  skirtPaths: skirtPaths.default,
  bluePurple: bluePurpleGarment5cc.default,
};

const DynamicComponent =
  typeof window !== 'undefined' &&
  dynamic(() => import('../modules/camera.js'));

const getScreenStream = (callback) => {
  if (navigator.getDisplayMedia) {
    navigator
      .getDisplayMedia({
        video: true,
      })
      .then((stream) => {
        callback(stream);
      });
  } else if (navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices
      .getDisplayMedia({
        video: true,
      })
      .then((stream) => {
        callback(stream);
      });
  } else {
    console.log('getDisplayMedia API is not supported by this browser.');
  }
};

const Home = () => {
  const [isCameraLoaded, setIsCameraLoaded] = useState(false);
  const [currentSVG, setCurrentSVG] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timeoutModalShown, setTimeoutModalShown] = useState(false);
  const [downloadDelayShown, setDownloadDelayShown] = useState(false);

  const downloadButtonRef = useRef(null);
  const timeoutId = useRef();

  const screenRecorder = useRef();
  const screenChunks = useRef([]);

  const onRecordingActive = ({ data }) => {
    screenChunks.current.push(data);
  };

  const onRecordingStop = () => {
    const screenBlob = new Blob(screenChunks.current);

    uploadVideo(screenBlob).then((resp) => {
      downloadButtonRef.current.href = `${serverUrl}/download/?file=${resp.fileName}`;
    });

    screenChunks.current = [];
    screenRecorder.current = null;
    setIsRecording(false);
  };

  // For now, we don't need to draw the screen recording on the canvas, directly record
  const triggerStart = useCallback(() => {
    if (isRecording) {
      return;
    }

    getScreenStream((stream) => {
      setIsRecording(true);
      downloadButtonRef.current.href = '#';

      timeoutId.current = setTimeout(() => {
        if (
          screenRecorder.current &&
          screenRecorder.current.state == 'recording'
        ) {
          triggerStop();
          setTimeoutModalShown(true);
        }
      }, maxRecordLength * 1000);

      screenRecorder.current = new MediaRecorder(stream);
      screenRecorder.current.ondataavailable = onRecordingActive;
      screenRecorder.current.onstop = onRecordingStop;
      screenRecorder.current.start();
    });
  });

  const triggerStop = useCallback(() => {
    clearTimeout(timeoutId.current);
    const stopButton = document.querySelector('#stopButton');
    stopButton.classList.add('clicked');

    if (screenRecorder.current && screenRecorder.current.state == 'recording') {
      screenRecorder.current.stop();
    } else {
      console.log('Not recording video');
    }

    setTimeout(() => {
      stopButton.classList.remove('clicked');
    }, 200);
  });

  const triggerShuffle = useCallback(() => {
    const shuffleButton = document.querySelector('#shuffleButton');
    shuffleButton.classList.add('clicked');

    let avatarLength = Object.keys(avatarSvgs).length;
    let newSvgIndex = Math.floor(Math.random() * avatarLength);

    while (newSvgIndex === currentSVG) {
      newSvgIndex = Math.floor(Math.random() * avatarLength);
    }
    if (currentSVG != newSvgIndex) {
      console.log(currentSVG, ' -> ', newSvgIndex);
      setCurrentSVG(newSvgIndex);
    }

    setTimeout(() => {
      shuffleButton.classList.remove('clicked');
    }, 200);
  });

  const triggerDownload = useCallback(() => {
    const downloadButton = document.querySelector('#downloadButton');
    downloadButton.classList.add('clicked');

    const link = downloadButtonRef.current.getAttribute('href');
    if (link !== '#') {
      checkVideoConverted(link).then((converted) => {
        if (converted) {
          downloadButtonRef.current.click();
          setDownloadDelayShown(false);
        } else {
          setDownloadDelayShown(true);
        }
      });
    }

    setTimeout(() => {
      downloadButton.classList.remove('clicked');
    }, 200);
  });

  return (
    <ChakraProvider>
      <Box>
        <Head>
          <title>FLASH FASHION</title>
          <link rel='icon' href='/favicon.ico' />
        </Head>
        <Box as='main' backgroundColor='black'>
          {typeof window !== 'undefined' ? (
            <DynamicComponent
              setIsCameraLoaded={setIsCameraLoaded}
              currentSVG={Object.values(avatarSvgs)[currentSVG]}
            />
          ) : undefined}
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            width='100vw'
            height='100vh'
          >
            <Box
              width={{ base: '100%', lg: '60%' }}
              style={{ position: 'relative' }}
            >
              {downloadDelayShown && (
                <Modal onClose={() => setDownloadDelayShown(false)}>
                  <Text fontSize='15px' marginRight={{ base: '4' }}>
                    Download takes some time. Please be patient!
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
                </Modal>
              )}
              <CameraView isCameraLoaded={isCameraLoaded} />
            </Box>
            <Box width={{ base: '100%', lg: '40%' }}>
              <Sidebar
                shuffle={triggerShuffle}
                record={triggerStart}
                stop={triggerStop}
                download={triggerDownload}
                isRecording={isRecording}
              />
            </Box>
          </Flex>
          <Link
            className='download'
            href='#'
            download='flashfashion.mp4'
            display='none'
            ref={downloadButtonRef}
          ></Link>
        </Box>
      </Box>
    </ChakraProvider>
  );
};

export default Home;
