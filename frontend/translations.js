(function() {
  function initTranslations() {
    // 1. Full Translation Dictionary (Home, About, Contact)
    const translations = {
      en: {
        nav_home: "Home",
        nav_about: "About",
        nav_contact: "Contact",
        footer_about: "Helping businesses turn strategic opportunities into successful, scalable projects.",
        footer_quicklinks: "Quick Links",
        footer_services: "Services",
        service_1: "Business Development",
        service_2: "Digital Solutions",
        service_3: "Growth Strategy",
        footer_rights: "All rights reserved.",
        about_badge: "About Us",
        about_title: "We don't just build businesses. <br>\n<span class=\"font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-branch-blue-dark via-branch-blue to-branch-green\">We help people grow.</span>",
        about_desc: "<span class=\"font-semibold\" translate=\"no\">Branch</span> helps entrepreneurs and businesses turn ideas into something real with the strategy, structure and execution to grow sustainably.",
        about_quote: "\"A <span class=\"font-semibold\" translate=\"no\"> Branch</span> never grows by itself. It grows because something beneath it keeps giving it life.\"",
        roots_title: "Our Roots",
        roots_p1: "Branch didn't start with a business plan. It started with people. A mother who gave everything so her children could grow. A sport that taught discipline long before it taught anything about winning. Mentors who shared hard truths at the right time. And a friend who planted a seed without ever knowing how big the tree would become.",
        roots_p2: "Basketball taught us that character matters more than talent, that discipline outlasts motivation, and that no one wins alone on the court you're never a collection of individuals, you're a team. We carried that mentality straight into entrepreneurship.",
        roots_p3: "Along the way we met founders with brilliant ideas that never grew. Not because the idea was weak or the work wasn't there, but because no one ever taught them how to build. How to turn scattered ideas into one system. How to create a brand people remember. How to keep something running even when you're not in the room. Those questions became <span class=\"font-semibold\" translate=\"no\"> Branch</span>.",
        mission_title: "Our Mission",
        mission_p1: "An entrepreneur needs a complete ecosystem to grow not just one strong Branch. So we help founders think, build strategy, develop brands, create content with purpose, and put the systems in place that let a business keep growing. We sell more than a service. We build trust, and trust creates growth.",
        mission_p2: "Building businesses is good. But helping people grow that's the mission.",
        code_title: "The <span class=\"font-semibold\" translate=\"no\"> Branch </span> Code",
        code_desc: "What we stand for every single day.",
        faith_title: "Faith before fear",
        faith_desc: "We start with belief, seeing and trusting your vision before we ever talk certainty.",
        character_title: "Character before money",
        character_desc: "Money follows character. Not the other way around.",
        people_title: "People before profit",
        people_desc: "People are never a means. People are the mission.",
        discipline_title: "Discipline before motivation",
        discipline_desc: "Motivation comes and goes. Discipline stays.",
        build_title: "Build together",
        build_desc: "Alone you may go faster. Together we go further, and we leave people better than we found them.",
        meeting_title: "Every meeting adds value",
        meeting_desc: "Not just to a business. To a person.",
        footer_quote: "\"Built for everyone who ever planted a seed in someone else's life, knowing they might never sit in the shade of the tree.\"",
        contact_badge: "Get In Touch",
        contact_title: "Let's Build Something Together",
        contact_desc: "Tell us about your project and we'll get back to you within 24 hours.",
        info_title: "Contact Information",
        hours_title: "Business Hours",
        monday_friday: "Monday – Friday",
        message_title: "Send Us a Message",
        label_name: "Full Name",
        label_email: "Email",
        label_company: "Company (optional)",
        label_project: "Project Type",
        project_select: "Select project type",
        label_message: "Message",
        btn_send: "Send Inquiry →",
        benefit1_title: "Quick Response",
        benefit1_desc: "We respond within 24 hours.",
        benefit2_title: "Tailored Solutions",
        benefit2_desc: "Every project is unique.",
        benefit3_title: "Long-Term Partnership",
        benefit3_desc: "Focused on sustainable growth.",
        cta_contact_title: "Have a project in mind?",
        cta_contact_desc: "Let's connect and turn your ideas into successful results.",
        btn_conversation: "Start a Conversation →"
      },
      nl: {
        nav_home: "Startpagina",
        nav_about: "Over Ons",
        nav_contact: "Contact",
        footer_about: "Bedrijven helpen strategische kansen om te zetten in succesvolle, schaalbare projecten.",
        footer_quicklinks: "Snelle Links",
        footer_services: "Diensten",
        service_1: "Bedrijfsontwikkeling",
        service_2: "Digitale Oplossingen",
        service_3: "Groeistrategie",
        footer_rights: "Alle rechten voorbehouden.",
        about_badge: "Over Ons",
        about_title: "We bouwen niet alleen bedrijven. <br>\n<span class=\"font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-branch-blue-dark via-branch-blue to-branch-green\">We helpen mensen groeien.</span>",
        about_desc: "<span class=\"font-semibold\" translate=\"no\">Branch</span> helpt ondernemers en bedrijven ideeën om te zetten in werkelijkheid, met de strategie, structuur en uitvoering om duurzaam te groeien.",
        about_quote: "\"Een <span class=\"font-semibold\" translate=\"no\"> Branch (tak)</span> groeit nooit vanzelf. Hij groeit omdat iets eronder hem leven blijft geven.\"",
        roots_title: "Onze Wortels",
        roots_p1: "Branch begon niet met een bedrijfsplan. Het begon met mensen. Een moeder die alles gaf zodat haar kinderen konden groeien. Een sport die discipline leerde lang voordat het over winnen ging. Mentoren die op het juiste moment harde waarheden deelden. En een vriend die een zaadje plantte zonder ooit te weten hoe groot de boom zou worden.",
        roots_p2: "Basketbal leerde ons dat karakter belangrijker is dan talent, dat discipline langer meegaat dan motivatie, en dat niemand alleen wint op het veld ben je nooit een verzameling individuen, je bent een team. Die mentaliteit namen we rechtstreeks mee het ondernemerschap in.",
        roots_p3: "Onderweg ontmoetten we oprichters met briljante ideeën die nooit groeiden. Niet omdat het idee zwak was of het werk er niet was, maar omdat niemand hen ooit heeft geleerd hoe ze moesten bouwen. Hoe verspreide ideeën om te zetten in één systeem. Hoe een merk te creëren dat mensen onthouden. Hoe iets draaiende te houden, zelfs als je niet in de kamer bent. Die vragen werden <span class=\"font-semibold\" translate=\"no\"> Branch</span>.",
        mission_title: "Onze Missie",
        mission_p1: "Een ondernemer heeft een compleet ecosysteem nodig om te groeien, niet slechts één sterke Branch. Dus helpen we oprichters na te denken, strategie te bouwen, merken te ontwikkelen, content met een doel te creëren en de systemen op te zetten waarmee een bedrijf kan blijven groeien. We verkopen meer dan een dienst. We bouwen vertrouwen, en vertrouwen creëert groei.",
        mission_p2: "Bedrijven bouwen is goed. Maar mensen helpen groeien, dat is de missie.",
        code_title: "De <span class=\"font-semibold\" translate=\"no\"> Branch </span> Code",
        code_desc: "Waar wij elke dag voor staan.",
        faith_title: "Geloof boven angst",
        faith_desc: "We beginnen met geloof; we zien en vertrouwen op jouw visie voordat we over zekerheden praten.",
        character_title: "Karakter voor geld",
        character_desc: "Geld volgt karakter. Niet andersom.",
        people_title: "Mensen boven winst",
        people_desc: "Mensen zijn nooit een middel. Mensen zijn de missie.",
        discipline_title: "Discipline voor motivatie",
        discipline_desc: "Motivatie komt en gaat. Discipline blijft.",
        build_title: "Samen bouwen",
        build_desc: "Alleen ga je misschien sneller. Samen komen we verder en laten we mensen beter achter dan we ze vonden.",
        meeting_title: "Elke ontmoeting voegt waarde toe",
        meeting_desc: "Niet alleen aan een bedrijf. Aan een persoon.",
        footer_quote: "\"Gebouwd voor iedereen die ooit een zaadje in andermans leven heeft geplant, wetende dat ze misschien nooit in de schaduw van de boom zullen zitten.\"",
        contact_badge: "Neem Contact Op",
        contact_title: "Laten We Samen Iets Bouwen",
        contact_desc: "Vertel ons over uw project en we nemen binnen 24 uur contact met u op.",
        info_title: "Contactgegevens",
        hours_title: "Openingstijden",
        monday_friday: "Maandag – Vrijdag",
        message_title: "Stuur Ons Een Bericht",
        label_name: "Volledige Naam",
        label_email: "E-mailadres",
        label_company: "Bedrijf (optioneel)",
        label_project: "Projecttype",
        project_select: "Selecteer projecttype",
        label_message: "Bericht",
        btn_send: "Aanvraag Verzenden →",
        benefit1_title: "Snelle Reactie",
        benefit1_desc: "Wij reageren binnen 24 uur.",
        benefit2_title: "Oplossingen op Maat",
        benefit2_desc: "Elk project is uniek.",
        benefit3_title: "Langdurige Partnerschap",
        benefit3_desc: "Gericht op duurzame groei.",
        cta_contact_title: "Heeft u een project in gedachten?",
        cta_contact_desc: "Laten we contact maken en uw ideeën omzetten in succesvolle resultaten.",
        btn_conversation: "Start een Gesprek →"
      }
    };

    // 2. Safely grab DOM Elements
    const langBtn = document.getElementById('language-btn');
    const langMenu = document.getElementById('language-menu');
    const langArrow = document.getElementById('lang-arrow');
    const currentLangText = document.getElementById('current-lang-text');
    const langOptions = document.querySelectorAll('.lang-option');

    // Make sure elements exist before running logic
    if (!langBtn || !langMenu) {
      console.warn("Language dropdown elements not found on this page.");
      return; 
    }

    // 3. Setup Initial Language from LocalStorage
    const savedLang = localStorage.getItem('branch_lang') || 'en';
    applyLanguage(savedLang);

    // 4. Dropdown Toggle Logic
    langBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevents button from behaving weirdly
      e.stopPropagation(); // Stops click from bubbling up
      
      const isHidden = langMenu.classList.contains('hidden');
      if (isHidden) {
        langMenu.classList.remove('hidden');
        if (langArrow) langArrow.classList.add('rotate-180');
      } else {
        langMenu.classList.add('hidden');
        if (langArrow) langArrow.classList.remove('rotate-180');
      }
    });

    // Close menu when clicking outside of it
    document.addEventListener('click', (e) => {
      if (!langMenu.contains(e.target) && !langBtn.contains(e.target)) {
        langMenu.classList.add('hidden');
        if (langArrow) langArrow.classList.remove('rotate-180');
      }
    });

    // Handle Option Clicks
    langOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedLang = option.getAttribute('data-lang');
        applyLanguage(selectedLang);
        
        // Hide menu after selection
        langMenu.classList.add('hidden');
        if (langArrow) langArrow.classList.remove('rotate-180');
      });
    });

    // 5. Apply Language Function
    function applyLanguage(langCode) {
      if (!translations[langCode]) langCode = 'en'; 
      localStorage.setItem('branch_lang', langCode);

      // Update Dropdown Selection UI
      let langName = "English"; // Default
      langOptions.forEach(opt => {
        const isMatch = opt.getAttribute('data-lang') === langCode;
        if (isMatch) langName = opt.querySelector('span').innerText;
        
        if (isMatch) {
          opt.classList.remove('text-gray-700');
          opt.classList.add('text-branch-blue', 'bg-blue-50/60');
          const check = opt.querySelector('.check-icon');
          if (check) check.classList.remove('hidden');
        } else {
          opt.classList.remove('text-branch-blue', 'bg-blue-50/60');
          opt.classList.add('text-gray-700');
          const check = opt.querySelector('.check-icon');
          if (check) check.classList.add('hidden');
        }
      });
      
      if (currentLangText) currentLangText.innerText = langName;

      // Swap Text Content globally
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[langCode][key]) {
          if (element.tagName === 'INPUT' && element.type === 'submit') {
            element.value = translations[langCode][key];
          } else if (element.tagName === 'OPTION') {
            element.innerText = translations[langCode][key];
          } else {
            element.innerHTML = translations[langCode][key];
          }
        }
      });
    }
  }

  // Ensure script runs whether the DOM is still loading or already finished
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranslations);
  } else {
    initTranslations();
  }
})();