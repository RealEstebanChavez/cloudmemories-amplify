import "@/styles/app.css";
import type { AppProps } from "next/app";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import Head from 'next/head';

Amplify.configure(outputs);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
    <Authenticator>
      {({ signOut, user }) => (
        <Component {...pageProps} user={user} signOut={signOut} />
      )}
    </Authenticator>
    </>
  );
}
