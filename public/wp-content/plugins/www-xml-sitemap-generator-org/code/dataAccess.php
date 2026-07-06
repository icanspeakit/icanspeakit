<?php

namespace xmlSitemapGenerator;





class dataAccess {
	
	
	
	function __construct() 
	{

	}
	
	static function execute($cmd) 
	{
		global $wpdb;
		$results = $wpdb->get_results($cmd, OBJECT );	

		return $results;
	}

	static function getDateField($name)
	{
		if ($name == "created")
		{ 
			return "post_date";
		}
		else
		{
			return "post_modified";
		}
	}
 

 
	public static function createMetaTable()
	{
		global $wpdb;		
		$tablemeta = $wpdb->prefix . 'xsg_sitemap_meta';
		$cmd = "CREATE TABLE IF NOT EXISTS `{$tablemeta}` (
				  `itemId` int(11) DEFAULT '0',
				  `inherit` int(11) DEFAULT '0',
				  `itemType` varchar(8) DEFAULT '',
				  `exclude` int(11) DEFAULT '0',
				  `priority` int(11) DEFAULT '0',
				  `frequency` int(11) DEFAULT '0',
				  UNIQUE KEY `idx_xsg_sitemap_meta_ItemId_ItemType` (`itemId`,`itemType`)
				) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='generatated by XmlSitemapGenerator.org';";

			
		$wpdb->query($cmd);

	}
	public static function getMetaItem($id, $type)
	{
		global $wpdb;
		$tablemeta = $wpdb->prefix . 'xsg_sitemap_meta';
		$cmd = " SELECT * FROM {$tablemeta}
				 WHERE itemId = %d AND itemType = %s ";
		
		$cmd = $wpdb->prepare($cmd, $id, $type);
		
		$settings = $wpdb->get_row($cmd);
	
		if ($settings) 
		{
			$settings->news = core::safeRead2($settings, "news",0); // for older version that didnt have this property.		
		}
		else
		{
			return new metaSettings(); 
			
		}
 		
		return $settings ;
	}
	
 
	public static function saveMetaItem($metaItem)
	{
		global $wpdb;		
		$tablemeta = $wpdb->prefix . 'xsg_sitemap_meta';
		$cmd = " INSERT INTO {$tablemeta} (itemId, itemType, exclude, priority, frequency, inherit, news) 
				 VALUES(%d, %s, %d, %d, %d, %d, %d) 
						ON DUPLICATE KEY UPDATE 
							exclude=VALUES(exclude), priority=VALUES(priority), frequency=VALUES(frequency), inherit=VALUES(inherit), news=VALUES(news) ";
			
		
	 
		$itemId = $metaItem->itemId;
		$itemType = $metaItem->itemType;
		$exclude = $metaItem->exclude;
		$priority = $metaItem->priority;
		$frequency = $metaItem->frequency;
		$inherit = $metaItem->inherit;
	 	$news = $metaItem->news;
		
		$cmd = $wpdb->prepare($cmd, $itemId, $itemType, $exclude, $priority , $frequency,$inherit, $news);
		
		$settings = $wpdb->query($cmd);
	
	}


	
	public static function getLastModified($date = "updated")
	{
		 
		
		global $wpdb;
	
		$date = self::getDateField($date);
	 
		$cmd = "SELECT UNIX_TIMESTAMP(MAX({$date}))
				FROM {$wpdb->posts} as posts
				WHERE post_status = 'publish'";
			
		$date = $wpdb->get_var($cmd);
		 
		return $date;
	}
	
	
	public static function getPostCountBand()
	{
		
		global $wpdb;
	
		
		$cmd = "SELECT COUNT(*)
				FROM {$wpdb->posts} as posts
				WHERE post_status = 'publish'";
			
		$postCount = (int)$wpdb->get_var($cmd);
		 
		if( $postCount = 0) {$postCountLabel = "0";}
		else if( $postCount <= 10) {$postCountLabel = "1 to 10";}
		else if( $postCount <= 25) {$postCountLabel = "11 to 25";}
		else if ($postCount <= 50) {$postCountLabel = "26 to 50";}
		else if ($postCount <= 100) {$postCountLabel = "51 to 100";}
		else if ($postCount <= 500) {$postCountLabel = "101 to 500";}
		else if ($postCount <= 500) {$postCountLabel = "501 to 1000";}
		else if($postCount < 10000) {$postCountLabel = round($postCount / 1000) * 1000;}
		else if($postCount < 100000) {$postCountLabel = round($postCount / 10000) * 10000;}
		else {$postCountLabel = round($postCount / 100000) * 100000;}
		
		return $postCountLabel;
		
	}
 



	
	
}




?>