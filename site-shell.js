(() => {
  function q(id){ return document.getElementById(id); }
  function ensureMarketingNavigation(){
    document.querySelectorAll(".sidebar-nav").forEach(nav=>{
      let link=nav.querySelector('a[href="marketing.html"]');
      if(!link){
        link=document.createElement("a");
        link.href="marketing.html";
        link.innerHTML="<span>שיווק והמרה</span>";
        nav.appendChild(link);
      }
      const page=window.location.pathname.split("/").pop()||"index.html";
      if(page==="marketing.html"){
        nav.querySelectorAll("a").forEach(item=>item.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }
  function createShell({ client, refresh, onSignedOut }){
    ensureMarketingNavigation();
    const button=q("site-profile-button"), menu=q("site-profile-menu"), avatar=q("site-profile-avatar"), fallback=q("site-profile-fallback"), name=q("site-profile-name"), role=q("site-profile-role"), edit=q("site-edit-profile"), password=q("site-change-password"), session=q("site-refresh-session"), logout=q("site-logout"), refreshButton=q("site-refresh-button"), modal=q("site-profile-modal"), close=q("site-profile-close"), form=q("site-profile-form"), displayName=q("site-profile-display-name"), fileInput=q("site-profile-avatar-file"), status=q("site-profile-status"), save=q("site-profile-save");
    if(!button||!menu) throw new Error("Site shell markup is missing");
    const closeMenu=()=>{ menu.hidden=true; button.setAttribute("aria-expanded","false"); };
    const openMenu=()=>{ menu.hidden=false; button.setAttribute("aria-expanded","true"); };
    const toggleMenu=()=>menu.hidden?openMenu():closeMenu();
    const closeModal=()=>{ if(!modal) return; modal.hidden=true; document.body.classList.remove("modal-open"); status.hidden=true; fileInput.value=""; };
    const loadProfile=async(session)=>{
      const fallbackName=session?.user?.email||"משתמש מחובר";
      const profile={display_name:fallbackName,role:"viewer",avatar_path:null,is_active:true};
      if(!session?.user?.id) return profile;
      const {data,error}=await client.from("app_users").select("display_name,role,avatar_path,is_active").eq("auth_user_id",session.user.id).maybeSingle();
      if(error) throw error;
      return data?{...profile,...data}:profile;
    };
    const renderProfile=async(session)=>{
      const profile=await loadProfile(session);
      name.textContent=profile.is_active===false?"משתמש לא פעיל":profile.display_name?.trim()||session?.user?.email||"משתמש מחובר";
      role.textContent=profile.role||"viewer";
      avatar.hidden=true; fallback.hidden=false;
      if(profile.avatar_path){
        const {data,error}=await client.storage.from("avatars").createSignedUrl(profile.avatar_path,3600);
        if(!error&&data?.signedUrl){ avatar.src=data.signedUrl; avatar.hidden=false; fallback.hidden=true; }
      }
      return profile;
    };
    const openEditor=async()=>{
      closeMenu();
      const {data,error}=await client.auth.getSession();
      if(error||!data.session) throw error||new Error("אין התחברות פעילה");
      const profile=await loadProfile(data.session);
      displayName.value=profile.display_name?.trim()||data.session.user.email||"";
      status.hidden=true;
      modal.hidden=false;
      document.body.classList.add("modal-open");
      setTimeout(()=>displayName.focus(),0);
    };
    button.addEventListener("click",toggleMenu);
    document.addEventListener("click",e=>{ if(!e.target.closest(".profile-menu-wrap")) closeMenu(); });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeMenu(); closeModal(); } });
    edit.addEventListener("click",()=>openEditor().catch(err=>alert(`פתיחת עריכת הפרופיל נכשלה: ${err.message}`)));
    password.addEventListener("click",()=>{ closeMenu(); window.location.href="./#password-recovery"; });
    session.addEventListener("click",async()=>{ session.disabled=true; try{ const {data,error}=await client.auth.refreshSession(); if(error) throw error; if(data.session) await renderProfile(data.session); closeMenu(); }catch(err){ alert(`רענון ההתחברות נכשל: ${err.message}`); }finally{ session.disabled=false; } });
    logout.addEventListener("click",async()=>{ closeMenu(); await client.auth.signOut(); onSignedOut?.(); });
    refreshButton.addEventListener("click",async()=>{ refreshButton.disabled=true; try{ await refresh?.(); }finally{ refreshButton.disabled=false; } });
    close.addEventListener("click",closeModal);
    modal.addEventListener("click",e=>{ if(e.target===modal) closeModal(); });
    form.addEventListener("submit",async e=>{
      e.preventDefault(); save.disabled=true; status.hidden=true;
      try{
        const {data,error}=await client.auth.getSession();
        if(error||!data.session) throw error||new Error("אין התחברות פעילה");
        const display=displayName.value.trim();
        if(display.length<2) throw new Error("יש להזין שם באורך שני תווים לפחות");
        let avatarPath=null;
        const file=fileInput.files[0];
        if(file){
          if(file.size>3*1024*1024) throw new Error("התמונה גדולה מ־3MB");
          if(!["image/png","image/jpeg","image/webp"].includes(file.type)) throw new Error("סוג הקובץ אינו נתמך");
          const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
          avatarPath=`${data.session.user.id}/avatar.${ext}`;
          const {error:uploadError}=await client.storage.from("avatars").upload(avatarPath,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
          if(uploadError) throw uploadError;
        }
        const update={display_name:display}; if(avatarPath) update.avatar_path=avatarPath;
        const {error:updateError}=await client.from("app_users").update(update).eq("auth_user_id",data.session.user.id);
        if(updateError) throw updateError;
        status.textContent="הפרופיל נשמר בהצלחה."; status.className="auth-status success"; status.hidden=false;
        await renderProfile(data.session);
        setTimeout(closeModal,500);
      }catch(err){ status.textContent=`שמירת הפרופיל נכשלה: ${err.message}`; status.className="auth-status error"; status.hidden=false; }
      finally{ save.disabled=false; }
    });
    return { renderProfile, closeMenu, closeModal };
  }
  window.BeautiXSiteShell={create:createShell};
})();