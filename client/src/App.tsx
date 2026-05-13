import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { CategoryPage } from "./pages/CategoryPage";
import { ArticlePage } from "./pages/ArticlePage";
import { SubmitPage } from "./pages/SubmitPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { StaticPage } from "./pages/StaticPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/article/:slug" element={<ArticlePage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/about" element={<StaticPage eyebrow="About" title="A newsroom project by Lakkhitha Kariyawasam" description="NewsNest is designed by Lakkhitha Kariyawasam from Colombo, Sri Lanka. It is a dynamic, fully responsive newsroom platform built for editorial publishing, moderation, and personalized reading." />} />
        <Route path="/contact" element={<StaticPage eyebrow="Contact" title="Talk to Lakkhitha Kariyawasam" description="Use this form to reach the developer behind NewsNest in Colombo, Sri Lanka." contact />} />
        <Route path="/privacy" element={<StaticPage eyebrow="Privacy" title="Privacy and data handling" description="User accounts, bookmarks, and submissions are stored locally in SQLite for the project demo developed by Lakkhitha Kariyawasam." />} />
      </Routes>
    </Layout>
  );
}
