<?php

namespace xmlSitemapGenerator;

	class postProvider extends providerCore  implements iSitemapProvider
	{
		
		
			public function getPageCount($pageSize)
			{
				
			}
			
			public function getPage($page,$pageSize)
			{
				
			}

		function getPosts( $sitemapDefaults, $limit = 0){
			
		 
			$results = dataAccess::getPages( $sitemapDefaults->dateField  , $limit);
			$temp = "";
			if ($results ) {

				foreach( $results as $result ) {
					 
					
				 //	wp_cache_add($result ->ID, $result , 'posts');
					$defaults = self::postTypeDefault($sitemapDefaults,$result->post_type );
	
					$exlcude = $this->getMetaValue($result->exclude, $result->tagExclude, $defaults->exclude) ;
					
					if ($exlcude == 2) {$temp = $temp . " - excluded";  continue;}
					if ( $result->post_status =='future' && $defaults->scheduled == 0)  { continue;}
					
					$pageUrl =  get_permalink($result);	
 
					if (!($this->isIncluded($pageUrl,$sitemapDefaults->excludeRules ))) {continue;}
							
					$url = new mapItem();
					$url->location = $pageUrl  ;				
					$url->title = get_the_title( $result ); //$result->post_title;
					$url->description = $result->post_excerpt;
					$url->modified  =  $result->sitemapDate ;	
					$url->priority =    $this->getMetaValue($result->priority,$result->tagPriority,  $defaults->priority)  ;	
					$url->frequency  =  $this->getMetaValue($result->frequency,$result->tagFrequency,$defaults->frequency) ;				
				 
					$this->addUrls(0, $url);

				}
			}
			
		}

 
// type = "post" or "page" , date = "created" or "updated"
	//$limit = 0 for no limit.)
	public static function getPages($date  , $limit)
	{
		global $wpdb;
		$date = self::getDateField($date);
		$frontPageId = get_option( 'page_on_front' );
	
		$tablemeta = $wpdb->prefix . 'xsg_sitemap_meta';
		
		$postTypes = "";
		foreach ( self::getPostTypes()  as $post_type ) 
		{
			$postTypes .=  " OR post_type = '{$post_type}'";
		}
			
			
		$cmd = "SELECT 
				posts.*,   
				postmeta.*,  Tag_meta.* , UNIX_TIMESTAMP({$date}) as sitemapDate
				FROM {$wpdb->posts} as posts 
					LEFT JOIN {$tablemeta} as postmeta ON posts.Id = postmeta.ItemId AND postmeta.itemId
					LEFT JOIN 
							(SELECT  
								terms.object_id as Post_id,
								Max(meta.exclude) as tagExclude,
								Max(meta.priority) as tagPriority,
								Max(meta.frequency) as tagFrequency
							FROM {$tablemeta} as meta 
								INNER JOIN {$wpdb->term_relationships} as terms
								ON  meta.itemId = terms.term_taxonomy_id AND meta.itemType = 'posts'
							WHERE meta.itemType = 'taxonomy' AND meta.inherit = 1
								
							GROUP BY terms.object_id 
							) as Tag_meta
						ON posts.Id = Tag_meta.Post_id
				WHERE (post_status = 'publish' OR post_status = 'future' ) AND (post_type = 'page' OR  post_type = 'post' {$postTypes})   
					AND posts.post_password = ''  AND posts.ID <> {$frontPageId}
				ORDER BY {$date} DESC  ";
 
			
		if ($limit > 0 ) 
		{ 
			$cmd .= " LIMIT {$limit} " ; 
		}
 
		$results = self::execute($cmd);
		
		return $results;				
	}
	
	
			static function postTypeDefault($sitemapDefaults,$name)
			{
						if ($name == 'page')
						{
								return $sitemapDefaults->pages;
						}
						elseif ($name == 'post')
						{
								return $sitemapDefaults->posts;
						}
						else
						{
								return ( isset( $sitemapDefaults->{$name} ) ?  $sitemapDefaults->{$name} : $sitemapDefaults->posts );
						}		
			}
		
	}




?>