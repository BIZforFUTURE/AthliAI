import React, { useEffect } from "react";
import { Redirect } from "expo-router";
import { registerBackgroundFetchAsync } from "../services/backgroundFetch";

export default function Index() {
  useEffect(() => {
    void registerBackgroundFetchAsync();
  }, []);

  return <Redirect href="/(tabs)" />;}
