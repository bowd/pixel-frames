import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getPreviousFrame,
  useFramesReducer,
  getFrameMessage,
} from "frames.js/next/server";
import Link from "next/link";
import { DEBUG_HUB_OPTIONS } from "./debug/constants";
import { getTokenUrl } from "frames.js";
import { useState } from "react";
import { getPixels, getPxLastUpdated, getUserLastWrite, setPixel } from "./pixels";

type State = {};

const initialState = {};

const reducer: FrameReducer<State> = (state, action) => {
  return state;
};

type FillPayload = {
  x: number;
  y: number;
  color: string;
}

function parseInput(input: string): FillPayload | null {
  const parts = input.split(",");
  if (parts.length != 3) return null;

  try {
    const [rX, rY, color] = parts;
    const x = parseInt(rX!)!
    const y = parseInt(rY!)!;

    if (isNaN(x) || isNaN(y)) return null;
    if (color == undefined) return null;
    if (!color.match(/^#[0-9a-f]{6}$/i)) return null;
    return { x, y, color };
  } catch (e) {
    return null
  }
}

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);
  console.log("info: previousFrame is:", previousFrame);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    ...DEBUG_HUB_OPTIONS,
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame,
  );

  const pixels = await getPixels();

  // Here: do a server side side effect either sync or async (using await), such as minting an NFT if you want.
  // example: load the users credentials & check they have an NFT

  console.log("info: state is:", state);
  let showError = false;
  let errorMessage = "";

  if (frameMessage) {
    const {
      isValid,
      buttonIndex,
      inputText,
      castId,
      requesterFid,
      casterFollowsRequester,
      requesterFollowsCaster,
      likedCast,
      recastedCast,
      requesterVerifiedAddresses,
      requesterUserData,
    } = frameMessage;
    if (isValid && buttonIndex === 1) {
      const payload = parseInput(inputText!);
      console.log("info: payload is:", payload)
      if (payload != null) {
        const { x, y, color } = payload;
        const lastPixelUpdate = await getPxLastUpdated(x, y);
        const lastUserWrite = await getUserLastWrite(requesterFid);
        const sinceLastPixelUpdate = Date.now() - lastPixelUpdate;
        const sinceLastUserWrite = Date.now() - lastUserWrite;

        if (sinceLastPixelUpdate < 1000 * 20) { // 5 seconds (testing)
          showError = true;
          errorMessage = "Pixel was updated too recently";
        } else if (sinceLastUserWrite < 1000 * 20) { // 5 seconds (testing)
          showError = true;
          errorMessage = "You updated a pixel too recently";
        } else {
          await setPixel(requesterFid, x, y, color);
          pixels[x]![y] = color!;
        }
      } else {
        showError = true;
        errorMessage = "Invalid input";
      }
    }
    console.log("info: frameMessage is:", frameMessage);
  }

  const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

  console.log("Rendering");

  // then, when done, return next frame
  return (
    <div className="p-4">
      frames.js starter kit. The Template Frame is on this page, it&aposs in the
      html meta tags (inspect source).{" "}
      <Link href={`/debug?url=${baseUrl}`} className="underline">
        Debug
      </Link>
      <FrameContainer
        postUrl="/frames"
        pathname="/"
        state={state}
        previousFrame={previousFrame}
      >
        {/* <FrameImage src="https://framesjs.org/og.png" /> */}
        <FrameImage>
          {showError ? <div style={{ color: 'red', padding: '50px' }}>{errorMessage}</div> : null}
          {pixels.map((row, x) => (
            <div
              key={x}
              style={{
                display: "flex",
                flexDirection: "row",
              }}
            >
              {row.map((color, y) => (
                <div
                  key={y}
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: color,
                    border: "1px solid #ccc",
                    display: "block",
                  }}
                ></div>
              ))}
            </div>
          ))}
        </FrameImage>
        <FrameInput text="x,y,color example: 0,0,#000000" />
        <FrameButton onClick={dispatch}>fill</FrameButton>
        <FrameButton onClick={dispatch}>refresh</FrameButton>
      </FrameContainer>
    </div>
  );
}
