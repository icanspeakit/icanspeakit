<?php

namespace xmlSitemapGenerator;

	class latestProvider extends providerCore  implements iSitemapProvider
	{
		
		
		public $maxPageSize = -1;
		
		public function getSuppportedTypes()
		{
			$types = array( "archive");	
			
			return $types;
		}
		
		public function getPageCount($type)
		{
			return 1;

		}
			
		public function getPage($page,$pageSize)
		{
			global $wpdb;
			
			$date = self::getDateField($this->sitemapDefaults->dateField);
			$postTypes = self::getPostTypes();
			$frontPageId = get_option( 'page_on_front' );
	
			$pageSize = 50;
			$offset =  0;
				
			$cmd = "SELECT  	posts.*,     UNIX_TIMESTAMP({$date}) as sitemapDate
				FROM {$wpdb->posts} as posts 
	
				WHERE (post_status = 'publish'  ) AND ( post_type = 'post' {$postTypes})   
					AND posts.post_password = ''  AND posts.ID <> {$frontPageId}
				ORDER BY {$date} DESC
				LIMIT {$offset},  {$pageSize} ";
					

			$results = $wpdb->get_results($cmd);
			if ($results ) 
			{
				$this->doPopulate($results);
			}		
			return $this->urlsList;
			
		}

 
		
		private function getPostTypes()
		{
			$args = array(
			   'public'   => true,
			   '_builtin' => false
				);
		  
			$output = 'names'; // 'names' or 'objects' (default: 'names')
			$operator = 'and'; // 'and' or 'or' (default: 'and')
			  
			$post_types = get_post_types( $args, $output, $operator );
		
			$postTypes = "";
			foreach ( $post_types  as $post_type ) 
			{
				$postTypes .=  " OR post_type = '{$post_type}'";
			}
			return $postTypes;
		}
		

		
		private function doPopulate($results)
		{
					foreach( $results as $result ) {
						 
						
					 //	wp_cache_add($result ->ID, $result , 'posts');
						$defaults = self::postTypeDefault($this->sitemapDefaults,$result->post_type );
		
					//	$exlcude = $this->getMetaValue($result->exclude, $result->tagExclude, $defaults->exclude) ;
						
					//	if ($exlcude == 2) {$temp = $temp . " - excluded";  continue;}
						if ( $result->post_status =='future' && $defaults->scheduled == 0)  { continue;}
						
						$pageUrl =  get_permalink($result);	
	 
						if (!($this->isIncluded($pageUrl,$this->sitemapDefaults->excludeRules ))) {continue;}
								
						$url = new mapItem();
						$url->location = $pageUrl  ;				
						$url->title = get_the_title( $result ); //$result->post_title;
						$url->description = $result->post_excerpt;
						$url->modified  =  $result->sitemapDate ;	
					//	$url->priority =    $this->getMetaValue($result->priority,$result->tagPriority,  $defaults->priority)  ;	
					//	$url->frequency  =  $this->getMetaValue($result->frequency,$result->tagFrequency,$defaults->frequency) ;				
					 
						$this->addUrls(0, $url);

					}
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