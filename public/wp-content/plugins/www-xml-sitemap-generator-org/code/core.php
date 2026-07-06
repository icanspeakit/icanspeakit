<?php

namespace xmlSitemapGenerator;

include_once 'dataAccess.php';
include_once 'settingsModels.php';
include_once 'upgrader.php';



	define ( "XSG_PLUGIN_VERSION" , "2.0.0");
	define ( "XSG_PLUGIN_NAME" , "www-xml-sitemap-generator-org"); 
	define ( "XSG_DONATE_URL","https://XmlSitemapGenerator.org/contribute/subscribeOther.aspx?service=wordpress");
// settings for general operation and rendering


	
class core {
	
	public static function pluginFilename() {
		return plugin_basename(myPluginFile());
	}

	public static function pluginVersion() {
		// getting version from file was causing issues.
		return XSG_PLUGIN_VERSION;
	}
 
	public static function safeRead2($object, $property, $default)
	{
		return ( isset( $object->{$property} ) ?  $object->{$property}  : $default );
	}
	public static function safeRead($object,$property)
	{
		return self::safeRead2($object,$property, "");
	}

	public static function getGlobalSettings()
	{
		$globalSettings =   get_option( "wpXSG_global"   , new globalSettings()  );

		// ensure when we read the global settings we have urls assigned
		$globalSettings->urlXmlSitemap = self::safeRead2($globalSettings,"urlXmlSitemap","xmlsitemap.xml");
		$globalSettings->urlNewsSitemap = self::safeRead2($globalSettings,"urlNewsSitemap","newssitemap.xml");
		$globalSettings->urlRssSitemap = self::safeRead2($globalSettings,"urlRssSitemap","rsssitemap.xml");
		$globalSettings->urlRssLatest = self::safeRead2($globalSettings,"urlRssLatest","rsslatest.xml");
		$globalSettings->urlHtmlSitemap = self::safeRead2($globalSettings,"urlHtmlSitemap","htmlsitemap.htm"); 
		
		return $globalSettings;
	}
	
	// called for each site being actiivated.
	public static function doSiteActivation()
	{
		self::addDatabaseTable();
		upgrader::doUpgrade();

		self::add_rewrite_rules();
	    flush_rewrite_rules();
	
		add_option( "wpXSG_MapId", uniqid("",true) );
		update_option( "xmsg_LastPing", 0 );
		
		self::updateStatistics("Plugin","Activate", "");

	}
	
	
	public static function activatePlugin($network_wide){

		if ( is_multisite() && $network_wide ) { 
		
                if ( false == is_super_admin() ) {
                    return;
                }
				
			global $wpdb;

			foreach ($wpdb->get_col("SELECT blog_id FROM $wpdb->blogs") as $blog_id) {
				switch_to_blog($blog_id);
				self::doSiteActivation();
				restore_current_blog();			
			} 

		} else {
			self::doSiteActivation();
		}
	}
	
	public static function activateNewBlog( $new_site ) {
		switch_to_blog(  $new_site->blog_id  );
		self::doSiteActivation();
		restore_current_blog();
	}

	
	// used to redirect the user to the plugin settings when activated manually.
	public static function activated($plugin) 
	{

		if( $plugin == self::pluginFilename() ) {
			wp_redirect( admin_url( 'options-general.php?page=www-xml-sitemap-generator-org' ));
			exit;
		}
	}
	
	public static function deactivatePlugin() {
		self::updateStatistics("Plugin","Deactivate","");
	}

	
 
	public static function initialisePlugin() 
	{

 		self::add_rewrite_rules();
 
		add_filter('query_vars', array(__CLASS__, 'add_query_variables'), 1, 1);
		add_filter('template_redirect', array(__CLASS__, 'templateRedirect'), 1, 0);
		
		// disable wordpress sitemap
		remove_action( 'init', 'wp_sitemaps_get_server' );
	
 
	// 2 is required for $file to be populated
		add_filter('plugin_row_meta', array(__CLASS__, 'filter_plugin_row_meta'),10,2);
		add_action('do_robots', array(__CLASS__, 'addRobotLinks'), 100, 0);
		add_action('wp_head', array(__CLASS__, 'addRssLink'),100);

		// only include admin files when necessary.
		if (is_admin() && !is_network_admin()) 
		{
			include_once 'settings.php';
			include_once 'postMetaData.php';
			include_once 'categoryMetaData.php';
			include_once 'authorMetaData.php';
			
			settings::addHooks();
			categoryMetaData::addHooks();
			postMetaData::addHooks();	
			authorMetaData::addHooks();
			
			add_action('admin_notices', array(__CLASS__, 'showWarnings'));
		}

		if (!wp_get_schedule('xmsg_ping')) 
		{
			// ping in 2 hours from when setup.
			wp_schedule_event(time() + 60*60*2 , 'daily', 'xmsg_ping');
		}

		add_action('xmsg_ping', array(__CLASS__, 'doPing'));
		
	}

	public static function getRewriteUrl($property)
	{
		$url = self::getGlobalProperty($property);
		$url = str_replace(".","\.",$url) . '$';
		return $url;
	}
	
	public static function add_rewrite_rules()
	{

		add_rewrite_rule(self::getRewriteUrl("urlXmlSitemap"), 'index.php?xsg-format=xml&xsg-provider=index&xsg-type=index&xsg-page=1','top');
		add_rewrite_rule(self::getRewriteUrl("urlNewsSitemap"),'index.php?xsg-format=news&xsg-provider=news&xsg-type=news&xsg-page=1','top');
		add_rewrite_rule(self::getRewriteUrl("urlRssSitemap"), 'index.php?xsg-format=rss&xsg-provider=index&xsg-type=index&xsg-page=1','top');
		add_rewrite_rule(self::getRewriteUrl("urlRssLatest"), 'index.php?xsg-format=rss&xsg-provider=latest&xsg-type=latest&xsg-page=1','top');
		add_rewrite_rule(self::getRewriteUrl("urlHtmlSitemap"),'index.php?xsg-format=htm&xsg-provider=index&xsg-type=index&xsg-page=1','top');
		add_rewrite_rule("sitemap-files/([a-z]+)/([a-z]+)/([^/]+)/([0-9]+)/?", 'index.php?xsg-format=$matches[1]&xsg-provider=$matches[2]&xsg-type=$matches[3]&xsg-page=$matches[4]&','top');
	}

	public static function add_query_variables($vars) {
		array_push($vars, 'xsg-format');
		array_push($vars, 'xsg-provider');
		array_push($vars, 'xsg-type');
		array_push($vars, 'xsg-page');
		return $vars;
	}

	static function showWarnings()
	{
		$screen = get_current_screen();
		if ($screen->base == 'settings_page_www-xml-sitemap-generator-org')
			{
			$warnings = "";
			$blog_public = get_option('blog_public');
			if ($blog_public == "0") 
			{
				$warnings = '<p>Your website is hidden from search engines. Please check your <i>Search Engine Visibility in <a href="options-reading.php">Reading Settings</a></i>.</p>';
			}

			if (!get_option('permalink_structure'))
			{
				$warnings = $warnings . '<p>Permalinks are not enabled. Please check your <i><a href="options-permalink.php">Permalink Settings</a></i> are NOT set to <i>Plain</i>.</p>';
			}
			
			if ($warnings)
			{
				echo '<div id="sitemap-warnings" class="error fade"><p><strong>Problems that will prevent your sitemap working correctly :</strong></p>' . $warnings . '</div>';
			}
			
		}
		
	}
	
	static function doPing()
	{
		include_once 'pinger.php';
		$globalSettings =  self::getGlobalSettings();
		
		if ($globalSettings->pingSitemap == true)
		{		
			$sitemapDefaults =  get_option( "wpXSG_sitemapDefaults"   , new sitemapDefaults()  );$sitemapDefaults =  get_option( "wpXSG_sitemapDefaults"   , new sitemapDefaults()  );
			pinger::doAutoPings($sitemapDefaults->dateField);
		}
		
	}
	
	static function addDatabaseTable()
	{
		try 
		{
			
			dataAccess::createMetaTable();
			update_option( "wpXSG_databaseUpgraded" ,  1 , false);
		} 
			catch (Exception $e) 
		{

		}
	}
 
	private static function readQueryVar($name)
	{	global $wp_query;
		if(!empty($wp_query->query_vars[$name]))
		{
			return $wp_query->query_vars[$name];
		}	
		return null;
	}
	

	
	public static function templateRedirect() {
	
		$format= self::readQueryVar("xsg-format");	
		$provider= self::readQueryVar("xsg-provider");	
		$type= self::readQueryVar("xsg-type");	
		$page= self::readQueryVar("xsg-page");	
		
	//	echo var_dump($format);
	//	exit;
		
		if($format !=null && $provider != null && $type !=null && $page !=null) 
		{
	
			global $wp_query;			
			global $wp;
			
			$wp_query->is_404 = false;
			$wp_query->is_feed = false;
			
		 	self::render($format, $provider,  $type,  $page); 	
			exit;	
			
		}
	}
	
	public static function render($format, $provider, $type, $page) 
	{		 
			$startTime =  microtime(true) ;
		
			include_once 'renderers/coreRenderer.php';
			include_once 'providers/coreProvider.php';

			$providerInstance = sitemapProvider::getInstance($provider);
			$renderer = sitemapRenderer::getInstance($format);
			
			if ($providerInstance == null ||$renderer == null) 
			{ 
				echo 'XML Sitemap Generator Error. <br />no provider or renderer loaded'; 
				exit;
			}
			
			$providerInstance->setFormat($format);
			
			$urls = $providerInstance->getPage($type, $page);
			
			if ($provider == "index")
				{ $renderer->renderIndex($urls);}
			else
				{$renderer->renderPages($urls);}
			
			$time = core::getTimeBand($startTime);
		 	core::updateStatistics("Render", "Render" . $format, $time);
		
	}

 
	public static function addRobotLinks() 
	{
		$globalSettings =   self::getGlobalSettings();
	 	if($globalSettings->addToRobots == true) 
	 	{
			$base = trailingslashit( get_bloginfo( 'url' ) );
			echo "\nSitemap: " . $base . self::getGlobalProperty("urlXmlSitemap") . "\n";
			
			echo "\nAllow: /" . self::getGlobalProperty("urlRssSitemap");
			echo "\nAllow: /" . self::getGlobalProperty("urlRssLatest");
			echo "\nAllow: /" . self::getGlobalProperty("urlHtmlSitemap");

	 	}
		echo "\n\n";
		echo self::safeRead($globalSettings,"robotEntries");
		
	}	
	public static function addRssLink() 
	{
		$globalSettings =   self::getGlobalSettings();
	 	if($globalSettings->addRssToHead == true) 
	 	{
			$base = trailingslashit( get_bloginfo( 'url' ) );
			$url = $base . "rsslatest.xml";
			$link = '<link rel="alternate" type="application/rss+xml" title="RSS" href="' .  $url . '" />';
			echo $link;
		}
	}	
 
	
	public static function getGlobalProperty($property)
	{
		$globalSettings = self::getGlobalSettings();
		$value = self::safeRead( $globalSettings, $property);
		return $value;		
	}


	
	static function filter_plugin_row_meta($links, $file) {
		$plugin  = self::pluginFilename();
		if ($file == $plugin)
		{
			$url = $_SERVER['REQUEST_URI'];
			if (strpos( $url, "network") == false) { 
				$new_links = array('<a href="options-general.php?page=' .  XSG_PLUGIN_NAME . '">settings</a>');
				$links = array_merge( $links, $new_links );
			}
				$new_links = array('<a href="' .  XSG_DONATE_URL . '">Donate</a>');
				$links = array_merge( $links, $new_links );

		}
		return $links;
	}
	
	private static function getCacheFile($cacheKey)
	{
		$file = str_replace('code','cache', __DIR__  ) . '\\' . $cacheKey . '.json';
		return $file;
	}
	public static function getCacheObject($cacheKey)
	{
		$cacheFile = self::getCacheFile($cacheKey);
		$cacheDuration = time() - (60 * 5 ); // 5 minute cache
		if ( file_exists($cacheFile) && (filemtime($cacheFile) > $cacheDuration) )
		{
		   $file = file_get_contents($cacheFile);
			return json_decode($file);		   
		}
	}
	
	public static function setCacheObject($cacheKey, $object)
	{
		$cacheFile = self::getCacheFile($cacheKey);

		file_put_contents($cacheFile , json_encode($object), LOCK_EX);	
	
		exit;		
	}
	
	static function getStatusHtml()
	{
		$array = get_option('xmsg_Log',"");
		
		if (is_array($array))
		{
			return implode("<br />", $array);
		}
		else
		{ return "Log empty";}
	}
	static function statusUpdate(  $statusMessage)
	{	
	
		$statusMessage = strip_tags($statusMessage);
		
		$array  = get_option('xmsg_Log',"");
		if (!is_array($array)) {$array = array();}
		$array = array_slice($array, 0, 19);		
		$newLine = gmdate("M d Y H:i:s", time()) . " - <strong>" . $statusMessage . "</strong>"  ;
		array_unshift($array , $newLine);	

		update_option('xmsg_Log', $array);
	}
	  static function doRequest($url) {

		$response = wp_remote_get($url );

		if(is_wp_error($response)) {
			$error = $response->get_error_messages();
			$error = substr(htmlspecialchars(implode('; ', $error)),0,150);
			return $error;
		}
		return substr($response['body'],0,200);
	}
	
	public static function getTimeBand($startTime)
	{
		$time = round(microtime(true) - $startTime);
		
		if( $time = 0) {$timeBand = "0";}
		else if( $time <= 10) {$timeBand = "1 to 10";}
		else if( $time <= 30) {$timeBand = "11 to 30";}
		else if ($time <= 60) {$timeBand = "31 to 60";}
		else if ($time <= 180) {$timeBand = "61 to 180";}
		else if ($time <= 300) {$timeBand = "181 to 300";}
		else if ($time <= 600) {$timeBand = "301 to 600";}
		else if ($time <= 1200) {$timeBand = "601 to 1200";}
		else if ($time <= 1800) {$timeBand = "1201 to 1800";}
		else {$timeBand = "> 1801";}
		
		return $timeBand;
	}
	public static function updateStatistics($eventCategory, $eventAction, $timeBand) {
		
		$globalSettings =   self::getGlobalSettings();
		
		if ($globalSettings->sendStats)
		{
			global $wp_version;
			$postCountLabel = dataAccess::getPostCountBand();

			$postData = array(
				'v' => 1,
				'tid' => 'UA-679276-7',
				'cid' => get_option('wpXSG_MapId'),
				'aip' => 1,
				't' => 'event',
				'ec' => $eventCategory,
				'ea' => $eventAction,
				'ev' => 1,
				'cd1' =>  site_url(),
				'cd2' => $wp_version,
				'cd3' => self::pluginVersion(),
				'cd4' => PHP_VERSION,
				'cd5' => $postCountLabel,
				'cd6' => $timeBand
			);

			$url = 'https://www.google-analytics.com/collect';
			
			try
			{
				$response = wp_remote_post($url,
					array(
						'method' => 'POST',
						'body' => $postData
						));				
			} 
				catch (Exception $e) 
			{
				statusUpdate("sendStats : " . $e->getMessage());
			}
			

		}
	}
}




?>