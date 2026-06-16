import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { TextToImagePage } from "./pages/TextToImagePage";
import { ImageTo3DPage } from "./pages/ImageTo3DPage";
import { ImageToVideoPage } from "./pages/ImageToVideoPage";
import { LipSyncPage } from "./pages/LipSyncPage";
import { StudioPage } from "./pages/StudioPage";
import { UpscalePage } from "./pages/UpscalePage";
import { AdsStudioPage } from "./pages/AdsStudioPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: LandingPage },
      { path: "auth", Component: AuthPage },
      {
        Component: ProtectedRoute,
        children: [
          { path: "text-to-image", Component: TextToImagePage },
          { path: "image-to-3d", Component: ImageTo3DPage },
          { path: "image-to-video", Component: ImageToVideoPage },
          { path: "lip-sync", Component: LipSyncPage },
          { path: "studio", Component: StudioPage },
          { path: "upscale", Component: UpscalePage },
          { path: "ads-studio", Component: AdsStudioPage },
        ],
      },
    ],
  },
]);
