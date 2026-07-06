<?php

namespace xmlSitemapGenerator;

	class indexProvider extends providerCore  implements iSitemapProvider
	{

		public $maxPageSize = -1;
		
		public function getSuppportedTypes()
		{
			$types[] = ("index");
			
			return $types;
		}
		

		
		public function getPageCount($type)
		{
				return 1;
		}


		private function addRssLatest()
		{
			$providers = sitemapProvider::getProviderList();
			$globalSettings = core::getGlobalSettings();
			$url = new mapItem();
			$url->location = $this->blogUrl . "/" . $globalSettings->urlRssLatest;	
			$url->title = "Latest posts sitemap.";
			$this->addUrls(0, $url);	
		}
		private function addNews()
		{
			$providers = sitemapProvider::getProviderList();
			$globalSettings = core::getGlobalSettings();
			$url = new mapItem();
			$url->location = $this->blogUrl . "/" . $globalSettings->urlNewsSitemap;	
			$url->title = "News sitemap.";
			$this->addUrls(0, $url);				
		}
		
		public function getPage($type, $page)
		{
			
			$providers = sitemapProvider::getProviderList();
			$globalSettings = core::getGlobalSettings();
			
			if ($this->format == "xml") 
			{
				if ($globalSettings->newsMode > 0 )
				{
					$this->addNews();					
				}
			}
			elseif ($this->format == "rss") 
			{
				$this->addRssLatest();
			}
		


			 foreach($providers as $providerName) 
			 {

				
				 $provider = sitemapProvider::getInstance($providerName);
				 $types = $provider->getSuppportedTypes();
				 
				 foreach($types as $typeName) 
				 { 			
					 $pages = $provider->getPageCount($typeName);
					 if ($pages > 0)
					 {
						$this->doPopulate($providerName, $typeName, $pages);						 
					 }

				 }

			 }
			  return $this->urlsList;
		}

		private function doPopulate($provider, $type, $pages)
		{
			$urls = array();
			$blogUrl = get_bloginfo( 'url' );

			$providerT = ucfirst($provider);
			$typeT = ucfirst($type);
				
			for ( $i= 1 ; $i <= $pages ; $i++)
			{
				$pageUrl = $blogUrl . "/sitemap-files/{$this->format}/{$provider}/{$type}/{$i}/" ;
				
				$url = new mapItem();
				$url->location = $pageUrl;	
				

			
				if ($provider == $type)
					{$url->title = "{$providerT} sitemap. Page {$i}.";}
				else
					{$url->title = "{$providerT} - {$typeT} sitemap. Page {$i}.";}
					
				$this->addUrls(0, $url);				
			}
		}
		
	}

?>