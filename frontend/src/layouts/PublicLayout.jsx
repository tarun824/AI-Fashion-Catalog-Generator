import React from "react";
import { Outlet } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import WhatsAppFloat from "../components/WhatsAppFloat";

const PublicLayout = () => {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-main">
        <Outlet />
      </main>
      <PublicFooter />
      <WhatsAppFloat />
    </div>
  );
};

export default PublicLayout;
