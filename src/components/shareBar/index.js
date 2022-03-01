import {
  Flex,
  Button,
  IconButton
} from "@chakra-ui/react";
import {
  TwitterIcon
} from "react-share";
import {
  TwitterShareButton
} from "react-share";
import Instagram from "../../icons/instagram";
import TikTok from "../../icons/tiktok";

const ShareBar = ({shareUrl="https://flashfashion.xyz", title="Flash Fashion", isRounded=true, size=32}) => {

  return (
    <Flex justifyContent="space-between" marginBottom="4">      
      <Button as={TwitterShareButton} url={shareUrl} title={title}>
        <TwitterIcon size={size} round={isRounded} />
      </Button>
      <IconButton onClick={()=>window.open("https://instagram.com", '_blank')} backgroundColor="transparent" _hover={{backgroundColor:"transparent"}}>
        <Instagram />
      </IconButton>      
      <Button onClick={()=>window.open("https://tiktok.com", '_blank')} backgroundColor="transparent" _hover={{backgroundColor:"transparent"}}>
        <TikTok />
      </Button>
    </Flex>
  )
}

export default ShareBar