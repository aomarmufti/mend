# MoveNet (SinglePose Thunder and Lightning, v4)

Google's MoveNet pose model in TensorFlow.js graph-model format, used as the
body tracker on browsers where the MediaPipe WebAssembly build fails (Safari
and every iPhone/iPad web view). Original model: https://tfhub.dev/google/movenet/singlepose/lightning/4
(Apache License 2.0). These converted files come from the `@vladmandic/human-models`
npm package (MIT) and are unmodified.

Input: int32 [1, 256, 256, 3] (Thunder) or [1, 192, 192, 3] (Lightning). Output: float [1, 1, 17, 3] as (y, x, score), normalised.
