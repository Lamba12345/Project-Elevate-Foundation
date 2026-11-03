package org.elevate.service;

import org.elevate.model.*;
import org.elevate.repository.*;
import org.elevate.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Seeds default database entities if they do not already exist:
 * - Authorized Editor and Admin accounts with BCrypt-hashed passwords
 * - Default editable site content (hero, mission, vision, programs, stats)
 * - Initial news articles matching existing website content
 * - Initial gallery images and announcements
 */
@Service
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepo;
    private final SiteContentRepository contentRepo;
    private final NewsArticleRepository newsRepo;
    private final AnnouncementRepository announcementRepo;
    private final SiteEventRepository eventRepo;
    private final GalleryItemRepository galleryRepo;
    private final SecurityUtils securityUtils;

    public DataInitializer(
            UserRepository userRepo,
            SiteContentRepository contentRepo,
            NewsArticleRepository newsRepo,
            AnnouncementRepository announcementRepo,
            SiteEventRepository eventRepo,
            GalleryItemRepository galleryRepo,
            SecurityUtils securityUtils
    ) {
        this.userRepo = userRepo;
        this.contentRepo = contentRepo;
        this.newsRepo = newsRepo;
        this.announcementRepo = announcementRepo;
        this.eventRepo = eventRepo;
        this.galleryRepo = galleryRepo;
        this.securityUtils = securityUtils;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        seedDefaultContent();
        seedNewsArticles();
        seedAnnouncements();
        seedEvents();
        seedGallery();
        log.info("Project Elevate database initialization complete.");
    }

    private void seedUsers() {
        if (!userRepo.existsByUsername("editor")) {
            User editor = new User(
                    "editor",
                    securityUtils.hashPassword("Elevate2026!"),
                    "Editorial Lead",
                    "EDITOR"
            );
            userRepo.save(editor);
            log.info("Default editor account created: username='editor', password='Elevate2026!'");
        }

        if (!userRepo.existsByUsername("admin")) {
            User admin = new User(
                    "admin",
                    securityUtils.hashPassword("ElevateAdmin2026!"),
                    "Administrator",
                    "ADMIN"
            );
            userRepo.save(admin);
            log.info("Default admin account created: username='admin', password='ElevateAdmin2026!'");
        }
    }

    private void seedDefaultContent() {
        seedContentItem("home.hero.badge", "home", "text", "🌍 Serving 12+ Countries Worldwide", "Hero Badge");
        seedContentItem("home.hero.title", "home", "html", "Elevating Lives,<br /><span class=\"hero-gradient-text\">Building Futures</span>", "Hero Heading");
        seedContentItem("home.hero.lead", "home", "text", "We empower underserved communities through education, healthcare, women empowerment, and sustainable development — one life at a time.", "Hero Subtitle");
        seedContentItem("home.hero.banner_img", "home", "image", "assets/images/hero_banner.jpg", "Hero Background Image");

        // Impact card
        seedContentItem("home.impact.card_header", "home", "text", "🌟 This Month's Impact", "Impact Card Header");
        seedContentItem("home.impact.meals_num", "home", "number", "847", "Meals Number");
        seedContentItem("home.impact.meals_label", "home", "text", "Meals distributed", "Meals Label");
        seedContentItem("home.impact.children_num", "home", "number", "124", "Children Number");
        seedContentItem("home.impact.children_label", "home", "text", "Children enrolled", "Children Label");
        seedContentItem("home.impact.families_num", "home", "number", "38", "Families Number");
        seedContentItem("home.impact.families_label", "home", "text", "Families housed", "Families Label");
        seedContentItem("home.impact.goal_percent", "home", "text", "73%", "Annual Goal Percentage");

        // Stats Bar
        seedContentItem("home.stats.stat1_num", "home", "text", "50,000+", "Stats 1 Number");
        seedContentItem("home.stats.stat1_label", "home", "text", "Lives Impacted", "Stats 1 Label");
        seedContentItem("home.stats.stat2_num", "home", "text", "120+", "Stats 2 Number");
        seedContentItem("home.stats.stat2_label", "home", "text", "Active Programs", "Stats 2 Label");
        seedContentItem("home.stats.stat3_num", "home", "text", "12", "Stats 3 Number");
        seedContentItem("home.stats.stat3_label", "home", "text", "Countries Served", "Stats 3 Label");
        seedContentItem("home.stats.stat4_num", "home", "text", "2,000+", "Stats 4 Number");
        seedContentItem("home.stats.stat4_label", "home", "text", "Dedicated Volunteers", "Stats 4 Label");

        // Mission Section
        seedContentItem("home.mission.label", "home", "text", "Our Mission", "Mission Section Label");
        seedContentItem("home.mission.title", "home", "html", "We Believe Every Life<br />Deserves to <em>Thrive</em>", "Mission Heading");
        seedContentItem("home.mission.p1", "home", "text", "Founded in 2026, Project Elevate Foundation bridges the gap between potential and opportunity. We combine grassroots community work with scalable programmes, channelling resources directly to those who need them most.", "Mission Paragraph 1");
        seedContentItem("home.mission.p2", "home", "text", "Our holistic approach addresses the root causes of inequality — not just the symptoms — through education, healthcare access, economic empowerment, and environmental sustainability.", "Mission Paragraph 2");
        seedContentItem("home.mission.badge_num", "home", "text", "1", "Mission Badge Number");
        seedContentItem("home.mission.badge_text", "home", "text", "Year of Impact", "Mission Badge Text");
        seedContentItem("home.mission.image", "home", "image", "assets/images/program_community.jpg", "Mission Image");

        // Programs Preview
        seedContentItem("home.programs.header_title", "home", "text", "Our Core Programs", "Programs Section Heading");
        seedContentItem("home.programs.header_desc", "home", "text", "Three flagship initiatives driving measurable change in communities worldwide.", "Programs Section Subtitle");

        seedContentItem("home.programs.learn.title", "home", "text", "Elevate Learn", "Learn Program Title");
        seedContentItem("home.programs.learn.desc", "home", "text", "Providing quality education, scholarships, and digital literacy to 15,000+ children and youth in underserved areas.", "Learn Program Description");
        seedContentItem("home.programs.learn.meta1", "home", "text", "📍 8 Countries", "Learn Program Meta 1");
        seedContentItem("home.programs.learn.meta2", "home", "text", "👥 15,200 Beneficiaries", "Learn Program Meta 2");
        seedContentItem("home.programs.learn.image", "home", "image", "assets/images/program_education.jpg", "Learn Program Image");

        seedContentItem("home.programs.roots.title", "home", "text", "Elevate Roots", "Roots Program Title");
        seedContentItem("home.programs.roots.desc", "home", "text", "Building sustainable infrastructure, clean water access, and affordable housing for families living in poverty.", "Roots Program Description");
        seedContentItem("home.programs.roots.meta1", "home", "text", "📍 12 Countries", "Roots Program Meta 1");
        seedContentItem("home.programs.roots.meta2", "home", "text", "👥 22,500 Beneficiaries", "Roots Program Meta 2");
        seedContentItem("home.programs.roots.image", "home", "image", "assets/images/program_community.jpg", "Roots Program Image");

        seedContentItem("home.programs.her.title", "home", "text", "Elevate Her", "Her Program Title");
        seedContentItem("home.programs.her.desc", "home", "text", "Equipping women with vocational skills, microfinance access, and mentorship to build economic independence.", "Her Program Description");
        seedContentItem("home.programs.her.meta1", "home", "text", "📍 6 Countries", "Her Program Meta 1");
        seedContentItem("home.programs.her.meta2", "home", "text", "👥 8,900 Beneficiaries", "Her Program Meta 2");
        seedContentItem("home.programs.her.image", "home", "image", "assets/images/program_women.jpg", "Her Program Image");

        // About page content
        seedContentItem("about.story.title", "about", "text", "How It All Began", "About Story Title");
        seedContentItem("about.story.p1", "about", "text", "Project Elevate Foundation was founded in 2026 from a simple but powerful idea: that every person, regardless of where they're born, deserves the opportunity to reach their full potential.", "About Story P1");
        seedContentItem("about.story.p2", "about", "text", "Our founder, Dzifa Asomany Esq, witnessed first-hand the devastating effects of inequality during her years as a field physician in East Africa. Fuelled by this experience, she rallied a team of educators, engineers, and community leaders to build something lasting.", "About Story P2");
        seedContentItem("about.story.p3", "about", "text", "Today, we operate across 12 countries with over 2,000 volunteers, 120+ active programmes, and a community of more than 50,000 lives directly touched by our work.", "About Story P3");
        seedContentItem("about.story.image", "about", "image", "assets/images/program_community.jpg", "About Story Image");

        seedContentItem("about.mission.text", "about", "text", "To empower underserved communities through education, healthcare, economic opportunity, and sustainable development, breaking cycles of poverty with lasting solutions.", "About Mission Statement");
        seedContentItem("about.vision.text", "about", "text", "A world where every individual — regardless of gender, geography, or circumstance — has the tools, knowledge, and support to live a dignified and fulfilling life.", "About Vision Statement");

        // Programs page detailed info
        seedContentItem("programs.learn.tagline", "programs", "text", "Quality education for every child — no matter where they're born.", "Programs Learn Tagline");
        seedContentItem("programs.learn.desc", "programs", "text", "Elevate Learn provides children and youth in underserved communities with access to quality schooling, scholarships, digital literacy, and vocational training. We work directly with local schools, governments, and families to ensure that education is not a privilege but a right.", "Programs Learn Description");

        seedContentItem("programs.roots.tagline", "programs", "text", "Building the foundation for thriving communities.", "Programs Roots Tagline");
        seedContentItem("programs.roots.desc", "programs", "text", "Elevate Roots addresses the basic needs of underserved communities — clean water, shelter, sanitation, and sustainable agriculture. Our engineers, architects, and community specialists co-design infrastructure solutions with local communities to ensure lasting impact.", "Programs Roots Description");

        seedContentItem("programs.her.tagline", "programs", "text", "Empowering women to build economic independence and community leadership.", "Programs Her Tagline");
        seedContentItem("programs.her.desc", "programs", "text", "Elevate Her equips women with vocational skills, business training, microfinance access, and mentorship networks. We believe that when women thrive, entire communities flourish — and the data backs us up.", "Programs Her Description");
    }

    private void seedContentItem(String key, String page, String type, String value, String label) {
        if (!contentRepo.existsByContentKey(key)) {
            SiteContent sc = new SiteContent(key, page, type, value, label, "system");
            contentRepo.save(sc);
        }
    }

    private void seedNewsArticles() {
        if (newsRepo.count() == 0) {
            NewsArticle a1 = new NewsArticle();
            a1.setTitle("New Scholarship Programme Reaches 500 Students in Rural Kenya");
            a1.setCategory("education");
            a1.setPublishDate("October 28, 2026");
            a1.setReadTime("5 min read");
            a1.setAuthor("Amara Diallo");
            a1.setExcerpt("In a landmark achievement for Project Elevate Foundation's Elevate Learn programme, our latest scholarship initiative has reached 500 deserving students across rural Kenya.");
            a1.setContent("In a landmark achievement for Project Elevate Foundation's Elevate Learn programme, we're proud to announce that our latest scholarship initiative has now reached 500 deserving students across rural communities in Kenya's Rift Valley region. These students — many of whom had never set foot in a classroom before — are now accessing quality education, digital tools, and mentorship that will shape their futures forever.");
            a1.setImageUrl("assets/images/program_education.jpg");
            a1.setFeatured(true);
            newsRepo.save(a1);

            NewsArticle a2 = new NewsArticle();
            a2.setTitle("Clean Water Initiative Completes 50th Borehole in Northern Ghana");
            a2.setCategory("community");
            a2.setPublishDate("October 15, 2026");
            a2.setReadTime("4 min read");
            a2.setAuthor("Kwame Asante");
            a2.setExcerpt("A landmark milestone — 50,000 people now have reliable access to safe drinking water thanks to our Elevate Roots programme.");
            a2.setContent("A landmark milestone — 50,000 people now have reliable access to safe drinking water thanks to our Elevate Roots programme. Clean water is the foundation of community health, education, and prosperity.");
            a2.setImageUrl("assets/images/program_community.jpg");
            newsRepo.save(a2);

            NewsArticle a3 = new NewsArticle();
            a3.setTitle("Elevate Her Celebrates 5th Anniversary with 200 New Graduates");
            a3.setCategory("empowerment");
            a3.setPublishDate("October 2, 2026");
            a3.setReadTime("6 min read");
            a3.setAuthor("Fatima Al-Hassan");
            a3.setExcerpt("Five years of transforming lives — over 2,000 women now run their own businesses, thanks to our vocational training programme.");
            a3.setContent("Five years of transforming lives — over 2,000 women now run their own businesses, thanks to our vocational training programme. Our graduates demonstrate extraordinary entrepreneurial courage and leadership.");
            a3.setImageUrl("assets/images/program_women.jpg");
            newsRepo.save(a3);

            NewsArticle a4 = new NewsArticle();
            a4.setTitle("Digital Literacy Programme Provides 1,000 Tablets to Remote Schools");
            a4.setCategory("education");
            a4.setPublishDate("September 18, 2026");
            a4.setReadTime("3 min read");
            a4.setAuthor("Sofia Martinez");
            a4.setExcerpt("Bridging the digital divide — our tech-in-schools initiative now covers 42 schools across Uganda, Rwanda, and Ethiopia.");
            a4.setContent("Bridging the digital divide — our tech-in-schools initiative now covers 42 schools across Uganda, Rwanda, and Ethiopia. Each device is equipped with offline educational resources and coding curricula.");
            a4.setImageUrl("assets/images/program_education.jpg");
            newsRepo.save(a4);

            NewsArticle a5 = new NewsArticle();
            a5.setTitle("From London to Lagos: My 6 Months Volunteering with Elevate Her");
            a5.setCategory("volunteer");
            a5.setPublishDate("September 5, 2026");
            a5.setReadTime("7 min read");
            a5.setAuthor("Sarah Chen");
            a5.setExcerpt("Volunteer Sarah Chen shares her transformative journey teaching entrepreneurship to women in southern Nigeria.");
            a5.setContent("Volunteer Sarah Chen shares her transformative journey teaching entrepreneurship to women in southern Nigeria. Working alongside these brilliant community leaders taught me the real meaning of resilience.");
            a5.setImageUrl("assets/images/program_community.jpg");
            newsRepo.save(a5);
        }
    }

    private void seedAnnouncements() {
        if (announcementRepo.count() == 0) {
            SiteAnnouncement a = new SiteAnnouncement();
            a.setTitle("2026 Community Scholarships Open");
            a.setMessage("Applications for our 2026 Global Education and STEM Scholarships are now officially open!");
            a.setBadge("NEW ANNOUNCEMENT");
            a.setLinkText("Apply Now");
            a.setLinkUrl("volunteer.html");
            a.setType("info");
            a.setActive(true);
            announcementRepo.save(a);
        }
    }

    private void seedEvents() {
        if (eventRepo.count() == 0) {
            SiteEvent e1 = new SiteEvent();
            e1.setTitle("Project Elevate Annual Impact Gala 2026");
            e1.setEventDate("November 28, 2026");
            e1.setEventTime("6:00 PM - 10:00 PM GMT");
            e1.setLocation("Accra International Conference Centre & Live Stream");
            e1.setDescription("Celebrating 1 year of high-impact community transformation with international partners, donors, and changemakers.");
            e1.setCategory("Fundraiser");
            e1.setRegisterUrl("donate.html");
            e1.setStatus("Registration Open");
            eventRepo.save(e1);

            SiteEvent e2 = new SiteEvent();
            e2.setTitle("Community Tech & Innovation Summit");
            e2.setEventDate("December 12, 2026");
            e2.setEventTime("10:00 AM - 3:30 PM GMT");
            e2.setLocation("Kano Digital Innovation Centre");
            e2.setDescription("Hands-on coding, STEM mentorship, and digital entrepreneurship workshops for 300+ youth leaders.");
            e2.setCategory("Workshop");
            e2.setRegisterUrl("contact.html");
            e2.setStatus("Upcoming");
            eventRepo.save(e2);
        }
    }

    private void seedGallery() {
        if (galleryRepo.count() == 0) {
            galleryRepo.save(new GalleryItem(
                    "Primary School Reading Hour",
                    "Children in Rift Valley engaged in interactive reading and STEM workshops.",
                    "assets/images/program_education.jpg",
                    "education",
                    1
            ));
            galleryRepo.save(new GalleryItem(
                    "Clean Water Borehole Commissioning",
                    "Community members celebrating the completion of their first solar-powered clean borehole.",
                    "assets/images/program_community.jpg",
                    "community",
                    2
            ));
            galleryRepo.save(new GalleryItem(
                    "Elevate Her Vocational Graduation",
                    "Graduates proudly displaying their business certification and micro-enterprise plans.",
                    "assets/images/program_women.jpg",
                    "empowerment",
                    3
            ));
            galleryRepo.save(new GalleryItem(
                    "Sunset Community Tree Planting",
                    "Over 800 youth volunteers joined our Green Future tree planting drive.",
                    "assets/images/hero_banner.jpg",
                    "community",
                    4
            ));
        }
    }
}

