import React from 'react';
import { Box } from '@chakra-ui/react'

const CameraView = ({isCameraLoaded}) => {
    return (
        <Box
            h="100vh !important"
            bgColor="black"
            // bgImage="url(assets/among-us-the-thing.png)"
            // bgSize="cover"
            position="relative"
            overflow="hidden"
            id="cc" 
            className="canvas-container"
        >
            <Box
                position="absolute"
                fontSize={{base:"3rem", md:"6rem", lg:"8rem"}}
                top="50%"
                left="50%"
                transform="translate(-50%,-50%)"
                display={isCameraLoaded ? "none" : "block"}
                id="loader"
                className="loading wave"
            >
                Loading
            </Box>
            <Box id="overlay" className="overlay cln"></Box>
            <Box id="main">
                <Box
                    width="100%"
                    height="100vh"
                    as="video"
                    id="video"
                    download
                    playsInline
                ></Box>
            </Box>
            <Box
                width="100%"
                height="100vh"
                left="0px"
                right="0px"
                as="video"
                id="screenVideo"
                position="fixed"
                display="none"
                playsInline
            ></Box>
            <Box
                as="canvas"
                id="screenCanvas"
                position= "fixed"
                zIndex= "9999"
                // width= "100%"
                // height= "100%"
                left= "0"
                display="none"
            ></Box>
            <Box as="canvas" id="output" className="camera-canvas"></Box>
            <Box as="canvas"
                width="100%"
                height="100vh"
                className="illustration-canvas"
            ></Box>
        </Box>
    )
}

export default CameraView