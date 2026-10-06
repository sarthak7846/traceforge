import path from "path";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

const nextConfig = {
  env: {
    OBSERVE_API_URL: process.env.OBSERVE_API_URL,
  },
};

export default nextConfig;
