/* eslint-disable */
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useEffect } from "react";
import makeRequest from "@/service/requester";

interface AuthData {
  access: string;
  refresh: string;
}

interface UserData {
  confirmed: boolean;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  image: string;
  account_settings: any; // You can define a more specific type if needed
  shipping_address: any; // You can define a more specific type if needed
}

interface UserResponse {
  payload: UserData;
}

interface Cart {
  cart_id: string;
}

interface User {
  cart?: Cart;
  confirmed?: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  image?: string;
  account_settings?: any;
  shipping_address?: any;
}

interface TransitionValues {
  duration: number;
  repeat: number;
  ease: string;
  y: {
    repeat: number;
    ease: string;
  };
}

const transitionValues: TransitionValues = {
  duration: 1.5,
  repeat: Infinity,
  ease: "easeInOut",
  y: {
    repeat: Infinity,
    ease: "easeOut"
  }
};

export default function VerifyPage() {
  const router = useRouter();
  console.log(router);


  const verifyAccessToken = async (): Promise<void> => {
    const params: string[] = router.asPath.split("&");
    
    for (const param of params) {
      if (param.startsWith("access_token")) {
        const accessToken: string = param.split("=")[1];
        
        try {
          const response: Response = await fetch(
            `${process.env.NEXT_PUBLIC_URL}/auth/tokenize/google-oauth2/?access_token=${accessToken}`
          );
          const data: AuthData = await response.json();

          console.log(data);
          const authData: AuthData = data; // assuming data contains auth data
          //const user = data.user; // assuming data contains user


          // 6. Save session to localStorage
          window.localStorage.setItem("token", authData.access);
          window.localStorage.setItem("refresh", authData.refresh);

          // 7. Show success and redirect
          toast.info(<div className="toast-msg">{"Login successful"}</div>);

          const redirectPath: string = (router.query.next as string) || "/";
          router.push(redirectPath);
        } catch (error: unknown) {
          console.error(error);
        }
      }
    }
  };

  useEffect(() => {
    verifyAccessToken();
  }, []);

  return (
    <>
      <div className="h-[100vh] w-[100vw] flex items-center justify-center">
        <motion.div 
          animate={{
            x: ["4rem", "-4rem", "4rem"],
            transition: transitionValues
          }}
          className="w-[20px] h-[20px] rounded-full bg-primary-500"
        ></motion.div>
      </div>
    </>
  );
}