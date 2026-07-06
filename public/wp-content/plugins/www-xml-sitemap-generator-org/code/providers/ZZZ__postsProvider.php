<?php

namespace xmlSitemapGenerator;

	class postsProvider extends providerCore  implements iSitemapProvider
	{
		
		
		public function getPageCount($pageSize)
		{
			global $wpdb;		
		
			$postTypes = self::getPostTypes();
			$frontPageId = get_option( 'page_on_front' );		
			
			$cmd = "SELECT Count(*)
						FROM {$wpdb->posts} as posts 
						WHERE (post_status = 'publish' OR post_status = 'future' ) AND (post_type = 'post' {$postTypes})   
							AND posts.post_password = ''  AND posts.ID <> {$frontPageId}";
 
			return self::getPages($wpdb->get_var($cmd),$pageSize);
		}
			
		public function getPage($page,$pageSize)
		{
			global $wpdb;
			
			$date = self::getDateField($this->sitemapDefaults->dateField);
			$postTypes = self::getPostTypes();
			$frontPageId = get_option( 'page_on_front' );
	
			$offset = ( $page - 1 ) * $pageSize;
				
			$cmd = "SELECT 
				posts.*,   
				postmeta.*,  Tag_meta.* , UNIX_TIMESTAMP({$date}) as sitemapDate
				FROM {$wpdb->posts} as posts 
					LEFT JOIN {$this->tablemeta} as postmeta ON posts.Id = postmeta.ItemId AND postmeta.itemId
					LEFT JOIN 
							(SELECT  
								terms.object_id as Post_id,
								Max(meta.exclude) as tagExclude,
								Max(meta.priority) as tagPriority,
								Max(meta.frequency) as tagFrequency
							FROM {$this->tablemeta} as meta 
								INNER JOIN {$wpdb->term_relationships} as terms
								ON  meta.itemId = terms.term_taxonomy_id AND meta.itemType = 'posts'
							WHERE meta.itemType = 'taxonomy' AND meta.inherit = 1
								
							GROUP BY terms.object_id 
							) as Tag_meta
						ON posts.Id = Tag_meta.Post_id
				WHERE (post_status = 'publish' OR post_status = 'future' ) AND ( post_type = 'post' {$postTypes})   
					AND posts.post_password = ''  AND posts.ID <> {$frontPageId}
				ORDER BY ID DESC
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
		
			return $postTypes;
		}
		

		
		private function doPopulate($results)
		{
					foreach( $results as $result ) {
						 
						
					 //	wp_cache_add($result ->ID, $result , 'posts');
						$defaults = self::postTypeDefault($this->sitemapDefaults,$result->post_type );
		
						$exlcude = $this->getMetaValue($result->exclude, $result->tagExclude, $defaults->exclude) ;
						
						if ($exlcude == 2) {$temp = $temp . " - excluded";  continue;}
						if ( $result->post_status =='future' && $defaults->scheduled == 0)  { continue;}
						
						$pageUrl =  get_permalink($result);	
	 
						if (!($this->isIncluded($pageUrl,$this->sitemapDefaults->excludeRules ))) {continue;}
								
						$url = new mapItem();
						$url->location = $pageUrl  ;				
						$url->title = get_the_title( $result ); //$result->post_title;
						$url->description = $result->post_excerpt;
						$url->modified  =  $result->sitemapDate ;	
						$url->priority =    $this->getMetaValue($result->priority,$result->tagPriority,  $defaults->priority)  ;	
						$url->frequency  =  $this->getMetaValue($result->frequency,$result->tagFrequency,$defaults->frequency) ;				
						$url->images = $this->getImages($result->post_content);
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